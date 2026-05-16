package callback

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/allbluelabs/synapse-runtime/internal/contracts"
	"github.com/allbluelabs/synapse-runtime/internal/security"
	"github.com/allbluelabs/synapse-runtime/internal/telemetry"
)

type Sender struct {
	client *http.Client
	keyID  string
	secret string
	logger telemetry.Logger
}

type Option func(*Sender)

func WithHTTPClient(client *http.Client) Option {
	return func(sender *Sender) {
		sender.client = client
	}
}

func NewSender(keyID string, secret string, logger telemetry.Logger, options ...Option) *Sender {
	if keyID == "" {
		keyID = "platform"
	}
	sender := &Sender{
		client: &http.Client{Timeout: 10 * time.Second},
		keyID:  keyID,
		secret: secret,
		logger: logger,
	}
	for _, option := range options {
		option(sender)
	}
	return sender
}

func (s *Sender) Send(ctx context.Context, request contracts.ExecutionRequest, response contracts.ExecutionResponse) error {
	if s == nil {
		return errors.New("callback sender is not configured")
	}
	if s.secret == "" {
		return errors.New("callback shared secret is not configured")
	}
	if request.Callback == nil || strings.TrimSpace(request.Callback.URL) == "" {
		return errors.New("callback url is required")
	}

	executionRequestID := stringValue(request.Metadata, "executionRequestId")
	if executionRequestID == "" {
		return errors.New("metadata.executionRequestId is required for callbacks")
	}

	body, err := json.Marshal(platformResult{
		TenantID:           request.TenantID,
		ExecutionRequestID: executionRequestID,
		RuntimeExecutionID: response.ExecutionID,
		Status:             platformStatus(response.Status),
		Output:             platformOutput(response),
		ErrorMessage:       emptyAsOmitted(response.Error),
		TraceID:            emptyAsOmitted(request.Context.TraceID),
	})
	if err != nil {
		return fmt.Errorf("marshal callback payload: %w", err)
	}

	target, err := url.Parse(request.Callback.URL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return errors.New("callback url is invalid")
	}

	maxRetries := request.Callback.MaxRetries
	if maxRetries < 0 {
		maxRetries = 0
	}
	timeout := durationFromMS(request.Callback.TimeoutMS, 10*time.Second)
	path := target.EscapedPath()
	if path == "" {
		path = "/"
	}
	if target.RawQuery != "" {
		path += "?" + target.RawQuery
	}

	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		attemptCtx, cancel := context.WithTimeout(ctx, timeout)
		err = s.sendOnce(attemptCtx, target.String(), path, body)
		cancel()
		if err == nil {
			s.logger.Info("runtime_callback_delivered", map[string]any{
				"tenantId":           request.TenantID,
				"executionRequestId": executionRequestID,
				"runtimeExecutionId": response.ExecutionID,
				"attempt":            attempt + 1,
				"status":             response.Status,
			})
			return nil
		}
		lastErr = err
		if attempt < maxRetries {
			time.Sleep(time.Duration(attempt+1) * 100 * time.Millisecond)
		}
	}

	return fmt.Errorf("callback delivery failed: %w", lastErr)
}

func (s *Sender) sendOnce(ctx context.Context, target string, path string, body []byte) error {
	timestamp := strconv.FormatInt(time.Now().UTC().Unix(), 10)
	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, target, bytes.NewReader(body))
	if err != nil {
		return err
	}
	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set(security.HeaderKeyID, s.keyID)
	httpRequest.Header.Set(security.HeaderTimestamp, timestamp)
	httpRequest.Header.Set(
		security.HeaderSignature,
		"sha256="+security.Sign(s.secret, http.MethodPost, path, timestamp, body),
	)

	response, err := s.client.Do(httpRequest)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
		return fmt.Errorf("callback returned status %d", response.StatusCode)
	}
	return nil
}

type platformResult struct {
	TenantID           string         `json:"tenantId"`
	ExecutionRequestID string         `json:"executionRequestId"`
	RuntimeExecutionID string         `json:"runtimeExecutionId,omitempty"`
	Status             string         `json:"status"`
	Output             map[string]any `json:"output,omitempty"`
	ErrorMessage       string         `json:"errorMessage,omitempty"`
	TraceID            string         `json:"traceId,omitempty"`
}

func platformOutput(response contracts.ExecutionResponse) map[string]any {
	output := map[string]any{
		"provider":  response.Provider,
		"model":     response.Model,
		"latencyMs": response.LatencyMS,
		"usage":     response.Usage,
		"metadata":  response.Metadata,
	}
	if response.Output != "" {
		output["output"] = response.Output
	}
	if response.StructuredPayload != nil {
		output["structuredPayload"] = response.StructuredPayload
	}
	clean := map[string]any{}
	for key, value := range output {
		if !empty(value) {
			clean[key] = value
		}
	}
	return clean
}

func platformStatus(status contracts.ExecutionStatus) string {
	switch status {
	case contracts.StatusSucceeded:
		return "SUCCEEDED"
	case contracts.StatusCancelled:
		return "CANCELLED"
	case contracts.StatusTimedOut:
		return "TIMED_OUT"
	default:
		return "FAILED"
	}
}

func durationFromMS(value int, fallback time.Duration) time.Duration {
	if value <= 0 {
		return fallback
	}
	return time.Duration(value) * time.Millisecond
}

func stringValue(values map[string]any, key string) string {
	if values == nil {
		return ""
	}
	value, ok := values[key].(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(value)
}

func emptyAsOmitted(value string) string {
	return strings.TrimSpace(value)
}

func empty(value any) bool {
	switch typed := value.(type) {
	case nil:
		return true
	case string:
		return typed == ""
	case map[string]any:
		return len(typed) == 0
	case contracts.Usage:
		return typed.InputTokens == 0 && typed.OutputTokens == 0 && typed.TotalTokens == 0
	default:
		return false
	}
}
