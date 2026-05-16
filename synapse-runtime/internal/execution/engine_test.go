package execution

import (
	"context"
	"errors"
	"testing"

	"github.com/allbluelabs/synapse-runtime/internal/contracts"
	"github.com/allbluelabs/synapse-runtime/internal/providers"
	"github.com/allbluelabs/synapse-runtime/internal/providers/fake"
	"github.com/allbluelabs/synapse-runtime/internal/telemetry"
)

type fixedID struct{}

func (fixedID) NewID() string { return "exec-test" }

func TestEngineExecuteFallback(t *testing.T) {
	registry := providers.NewRegistry(
		fake.Provider{NameValue: "openai", Err: errors.New("temporary provider failure")},
		fake.Provider{NameValue: "claude", Output: "ok"},
	)
	engine := NewEngine(registry, telemetry.NewLogger(), fixedID{})

	response := engine.Execute(context.Background(), contracts.ExecutionRequest{
		TenantID:           "tenant-a",
		Module:             "pulse",
		ProviderPreference: []string{"openai", "claude"},
		Policy: contracts.ExecutionPolicy{
			MaxRetries:       0,
			FallbackEnabled:  true,
			AllowedProviders: []string{"openai", "claude"},
		},
		Input: contracts.ExecutionInput{Prompt: "summarize safely"},
	})

	if response.Status != contracts.StatusSucceeded {
		t.Fatalf("expected success, got %s: %s", response.Status, response.Error)
	}
	if response.Provider != "claude" {
		t.Fatalf("expected fallback provider claude, got %s", response.Provider)
	}
	if !response.Retry.FallbackUsed {
		t.Fatal("expected fallback metadata")
	}
}

func TestEngineValidation(t *testing.T) {
	engine := NewEngine(providers.NewRegistry(), telemetry.NewLogger(), fixedID{})

	response := engine.Execute(context.Background(), contracts.ExecutionRequest{
		Module: "pulse",
		Input:  contracts.ExecutionInput{Prompt: "hello"},
	})

	if response.Status != contracts.StatusFailed {
		t.Fatalf("expected failed validation, got %s", response.Status)
	}
	if response.Error != "tenantId is required" {
		t.Fatalf("unexpected error: %s", response.Error)
	}
}

func TestEngineStructuredOutputParsing(t *testing.T) {
	registry := providers.NewRegistry(
		fake.Provider{NameValue: "openai", Output: `{"decisionSummary":"ok","confidence":0.9}`},
	)
	engine := NewEngine(registry, telemetry.NewLogger(), fixedID{})

	response := engine.Execute(context.Background(), contracts.ExecutionRequest{
		TenantID: "tenant-a",
		Module:   "pulse",
		Input:    contracts.ExecutionInput{Prompt: "return json"},
		StructuredOutput: &contracts.StructuredOutputSpec{
			Format: "json_schema",
			Schema: map[string]any{"type": "object"},
		},
	})

	if response.Status != contracts.StatusSucceeded {
		t.Fatalf("expected success, got %s: %s", response.Status, response.Error)
	}
	if response.StructuredPayload["decisionSummary"] != "ok" {
		t.Fatalf("expected parsed structured payload, got %#v", response.StructuredPayload)
	}
}

func TestEngineStructuredOutputParsingFailure(t *testing.T) {
	registry := providers.NewRegistry(
		fake.Provider{NameValue: "openai", Output: "not json"},
	)
	engine := NewEngine(registry, telemetry.NewLogger(), fixedID{})

	response := engine.Execute(context.Background(), contracts.ExecutionRequest{
		TenantID: "tenant-a",
		Module:   "pulse",
		Input:    contracts.ExecutionInput{Prompt: "return json"},
		StructuredOutput: &contracts.StructuredOutputSpec{
			Format: "json_schema",
			Schema: map[string]any{"type": "object"},
		},
	})

	if response.Status != contracts.StatusFailed {
		t.Fatalf("expected failed structured parsing, got %s", response.Status)
	}
	if len(response.Retry.ProviderErrors) == 0 {
		t.Fatal("expected provider error metadata for invalid structured output")
	}
}
