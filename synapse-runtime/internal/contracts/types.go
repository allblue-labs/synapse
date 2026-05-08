package contracts

import "time"

type ExecutionStatus string

const (
	StatusSucceeded ExecutionStatus = "succeeded"
	StatusFailed    ExecutionStatus = "failed"
	StatusCancelled ExecutionStatus = "cancelled"
	StatusTimedOut  ExecutionStatus = "timed_out"
)

type ExecutionRequest struct {
	TenantID           string                `json:"tenantId"`
	WorkspaceID        string                `json:"workspaceId,omitempty"`
	Module             string                `json:"module"`
	Skill              string                `json:"skill,omitempty"`
	ProviderPreference []string              `json:"providerPreference,omitempty"`
	ModelPreference    string                `json:"modelPreference,omitempty"`
	Policy             ExecutionPolicy       `json:"policy,omitempty"`
	AllowedTools       []ToolDescriptor      `json:"allowedTools,omitempty"`
	StructuredOutput   *StructuredOutputSpec `json:"structuredOutput,omitempty"`
	TimeoutMS          int                   `json:"timeoutMs,omitempty"`
	Input              ExecutionInput        `json:"input"`
	Context            ExecutionContext      `json:"context,omitempty"`
	Metadata           map[string]any        `json:"metadata,omitempty"`
}

type ExecutionInput struct {
	Prompt   string        `json:"prompt,omitempty"`
	Messages []ChatMessage `json:"messages,omitempty"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ExecutionPolicy struct {
	MaxRetries       int      `json:"maxRetries,omitempty"`
	TimeoutMS        int      `json:"timeoutMs,omitempty"`
	FallbackEnabled  bool     `json:"fallbackEnabled,omitempty"`
	AllowedProviders []string `json:"allowedProviders,omitempty"`
}

type ToolDescriptor struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Schema      map[string]any `json:"schema,omitempty"`
}

type StructuredOutputSpec struct {
	Format string         `json:"format"`
	Schema map[string]any `json:"schema,omitempty"`
}

type ExecutionContext struct {
	ExecutionScope      string          `json:"executionScope,omitempty"`
	SecurityContext     SecurityContext `json:"securityContext,omitempty"`
	OperationalMetadata map[string]any  `json:"operationalMetadata,omitempty"`
	TraceID             string          `json:"traceId,omitempty"`
}

type SecurityContext struct {
	ActorUserID string   `json:"actorUserId,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
}

type ExecutionResponse struct {
	ExecutionID       string          `json:"executionId"`
	TenantID          string          `json:"tenantId"`
	Provider          string          `json:"provider,omitempty"`
	Model             string          `json:"model,omitempty"`
	Output            string          `json:"output,omitempty"`
	StructuredPayload map[string]any  `json:"structuredPayload,omitempty"`
	Usage             Usage           `json:"usage,omitempty"`
	LatencyMS         int64           `json:"latencyMs"`
	Status            ExecutionStatus `json:"status"`
	Error             string          `json:"error,omitempty"`
	Retry             RetryMetadata   `json:"retry"`
	Metadata          map[string]any  `json:"metadata,omitempty"`
	StartedAt         time.Time       `json:"startedAt"`
	CompletedAt       time.Time       `json:"completedAt"`
}

type Usage struct {
	InputTokens  int `json:"inputTokens,omitempty"`
	OutputTokens int `json:"outputTokens,omitempty"`
	TotalTokens  int `json:"totalTokens,omitempty"`
}

type RetryMetadata struct {
	Attempts       int      `json:"attempts"`
	ProviderErrors []string `json:"providerErrors,omitempty"`
	FallbackUsed   bool     `json:"fallbackUsed"`
}

type ProviderInfo struct {
	Name   string   `json:"name"`
	Health string   `json:"health"`
	Models []string `json:"models,omitempty"`
}
