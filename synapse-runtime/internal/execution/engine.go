package execution

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/allbluelabs/synapse-runtime/internal/contracts"
	"github.com/allbluelabs/synapse-runtime/internal/policies"
	"github.com/allbluelabs/synapse-runtime/internal/providers"
	"github.com/allbluelabs/synapse-runtime/internal/telemetry"
)

type Engine struct {
	registry *providers.Registry
	logger   telemetry.Logger
	ids      IDGenerator
}

type IDGenerator interface {
	NewID() string
}

type TimeIDGenerator struct{}

func (TimeIDGenerator) NewID() string {
	return fmt.Sprintf("exec_%d", time.Now().UTC().UnixNano())
}

func NewEngine(registry *providers.Registry, logger telemetry.Logger, ids IDGenerator) *Engine {
	if ids == nil {
		ids = TimeIDGenerator{}
	}
	return &Engine{registry: registry, logger: logger, ids: ids}
}

func (e *Engine) Execute(ctx context.Context, request contracts.ExecutionRequest) contracts.ExecutionResponse {
	startedAt := time.Now().UTC()
	executionID := e.ids.NewID()

	response := contracts.ExecutionResponse{
		ExecutionID: executionID,
		TenantID:    request.TenantID,
		Status:      contracts.StatusFailed,
		StartedAt:   startedAt,
	}

	if err := validateRequest(request); err != nil {
		return e.fail(response, startedAt, err, nil)
	}

	policy, err := policies.Resolve(request)
	if err != nil {
		return e.fail(response, startedAt, err, nil)
	}

	ctx, cancel := context.WithTimeout(ctx, policy.Timeout)
	defer cancel()

	candidates := e.providerCandidates(request, policy)
	if len(candidates) == 0 {
		return e.fail(response, startedAt, errors.New("no allowed providers available"), nil)
	}

	type attemptResult struct {
		provider string
		result   providers.ProviderResponse
		err      error
		latency  time.Duration
	}

	errorsByProvider := []string{}
	attempts := 0
	for i, provider := range candidates {
		if i > 0 && !policy.FallbackEnabled {
			break
		}
		if i > 0 {
			response.Retry.FallbackUsed = true
		}

		for retry := 0; retry <= policy.MaxRetries; retry++ {
			attempts++
			resultCh := make(chan attemptResult, 1)
			go func(provider providers.Provider) {
				attemptStart := time.Now()
				result, err := provider.Execute(ctx, request)
				resultCh <- attemptResult{
					provider: provider.Name(),
					result:   result,
					err:      err,
					latency:  time.Since(attemptStart),
				}
			}(provider)

			select {
			case <-ctx.Done():
				response.Retry.Attempts = attempts
				response.Retry.ProviderErrors = errorsByProvider
				status := contracts.StatusCancelled
				if errors.Is(ctx.Err(), context.DeadlineExceeded) {
					status = contracts.StatusTimedOut
				}
				response.Status = status
				response.Error = ctx.Err().Error()
				response.CompletedAt = time.Now().UTC()
				response.LatencyMS = response.CompletedAt.Sub(startedAt).Milliseconds()
				return response
			case attempt := <-resultCh:
				if attempt.err == nil {
					normalized, err := normalizeProviderResponse(request, attempt.result)
					if err != nil {
						errorsByProvider = append(errorsByProvider, fmt.Sprintf("%s: %s", attempt.provider, err.Error()))
						e.logger.Error("execution_attempt_failed", map[string]any{
							"executionId": executionID,
							"tenantId":    request.TenantID,
							"provider":    attempt.provider,
							"attempt":     retry + 1,
							"error":       err.Error(),
						})
						continue
					}
					completedAt := time.Now().UTC()
					e.logger.Info("execution_succeeded", map[string]any{
						"executionId": executionID,
						"tenantId":    request.TenantID,
						"provider":    attempt.provider,
						"latencyMs":   attempt.latency.Milliseconds(),
						"attempts":    attempts,
					})
					return contracts.ExecutionResponse{
						ExecutionID:       executionID,
						TenantID:          request.TenantID,
						Provider:          normalized.Provider,
						Model:             normalized.Model,
						Output:            normalized.Output,
						StructuredPayload: normalized.StructuredPayload,
						Usage:             normalized.Usage,
						LatencyMS:         completedAt.Sub(startedAt).Milliseconds(),
						Status:            contracts.StatusSucceeded,
						Retry: contracts.RetryMetadata{
							Attempts:       attempts,
							ProviderErrors: errorsByProvider,
							FallbackUsed:   response.Retry.FallbackUsed,
						},
						Metadata:    normalized.Metadata,
						StartedAt:   startedAt,
						CompletedAt: completedAt,
					}
				}
				errorsByProvider = append(errorsByProvider, fmt.Sprintf("%s: %s", attempt.provider, attempt.err.Error()))
				e.logger.Error("execution_attempt_failed", map[string]any{
					"executionId": executionID,
					"tenantId":    request.TenantID,
					"provider":    attempt.provider,
					"attempt":     retry + 1,
					"error":       attempt.err.Error(),
				})
			}
		}
	}

	response.Retry.Attempts = attempts
	response.Retry.ProviderErrors = errorsByProvider
	return e.fail(response, startedAt, errors.New("all providers failed"), nil)
}

func (e *Engine) Providers(ctx context.Context) []contracts.ProviderInfo {
	items := []contracts.ProviderInfo{}
	for _, provider := range e.registry.Providers() {
		info := contracts.ProviderInfo{Name: provider.Name(), Health: "ok"}
		if err := provider.Health(ctx); err != nil {
			info.Health = "unavailable"
		}
		models, err := provider.Models(ctx)
		if err == nil {
			info.Models = models
		}
		items = append(items, info)
	}
	return items
}

func (e *Engine) Models(ctx context.Context) map[string][]string {
	out := map[string][]string{}
	for _, provider := range e.registry.Providers() {
		models, err := provider.Models(ctx)
		if err != nil {
			out[provider.Name()] = []string{}
			continue
		}
		out[provider.Name()] = models
	}
	return out
}

func (e *Engine) providerCandidates(request contracts.ExecutionRequest, policy policies.ResolvedPolicy) []providers.Provider {
	names := request.ProviderPreference
	if len(names) == 0 {
		names = e.registry.Names()
	}

	candidates := []providers.Provider{}
	for _, name := range names {
		if !policies.ProviderAllowed(policy, name) {
			continue
		}
		provider, ok := e.registry.Get(name)
		if ok {
			candidates = append(candidates, provider)
		}
	}
	return candidates
}

func (e *Engine) fail(response contracts.ExecutionResponse, startedAt time.Time, err error, metadata map[string]any) contracts.ExecutionResponse {
	completedAt := time.Now().UTC()
	response.Error = err.Error()
	response.Metadata = metadata
	response.CompletedAt = completedAt
	response.LatencyMS = completedAt.Sub(startedAt).Milliseconds()
	e.logger.Error("execution_failed", map[string]any{
		"executionId": response.ExecutionID,
		"tenantId":    response.TenantID,
		"status":      response.Status,
		"error":       err.Error(),
		"attempts":    response.Retry.Attempts,
	})
	return response
}

func normalizeProviderResponse(
	request contracts.ExecutionRequest,
	response providers.ProviderResponse,
) (providers.ProviderResponse, error) {
	if request.StructuredOutput == nil || response.StructuredPayload != nil {
		return response, nil
	}
	if response.Output == "" {
		return response, errors.New("structured output was requested but provider returned empty output")
	}

	var payload map[string]any
	if err := json.Unmarshal([]byte(response.Output), &payload); err != nil {
		return response, fmt.Errorf("structured output was requested but provider output is not valid JSON: %w", err)
	}
	response.StructuredPayload = payload
	return response, nil
}

func validateRequest(request contracts.ExecutionRequest) error {
	if request.TenantID == "" {
		return errors.New("tenantId is required")
	}
	if request.Module == "" {
		return errors.New("module is required")
	}
	if request.Input.Prompt == "" && len(request.Input.Messages) == 0 {
		return errors.New("input.prompt or input.messages is required")
	}
	for _, tool := range request.AllowedTools {
		if tool.Name == "" {
			return errors.New("allowedTools.name is required")
		}
	}
	return nil
}
