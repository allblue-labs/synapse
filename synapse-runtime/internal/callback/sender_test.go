package callback

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/allbluelabs/synapse-runtime/internal/contracts"
	"github.com/allbluelabs/synapse-runtime/internal/security"
	"github.com/allbluelabs/synapse-runtime/internal/telemetry"
)

func TestSenderDeliversSignedPlatformResult(t *testing.T) {
	var received map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read body: %v", err)
		}
		verifier := security.NewVerifier(map[string]string{"platform": "secret"})
		if err := verifier.Verify(r, body); err != nil {
			t.Fatalf("expected valid signature: %v", err)
		}
		if err := json.Unmarshal(body, &received); err != nil {
			t.Fatalf("unmarshal callback: %v", err)
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()

	sender := NewSender("platform", "secret", telemetry.NewLogger())
	err := sender.Send(context.Background(), contracts.ExecutionRequest{
		TenantID: "tenant-1",
		Module:   "pulse",
		Callback: &contracts.ExecutionCallback{
			URL: server.URL + "/v1/runtime/results",
		},
		Context: contracts.ExecutionContext{TraceID: "trace-1"},
		Metadata: map[string]any{
			"executionRequestId": "exec-request-1",
		},
	}, contracts.ExecutionResponse{
		ExecutionID:       "runtime-exec-1",
		TenantID:          "tenant-1",
		Provider:          "openai",
		Model:             "gpt-test",
		Status:            contracts.StatusSucceeded,
		StructuredPayload: map[string]any{"decisionSummary": "ok"},
		Usage:             contracts.Usage{InputTokens: 10, OutputTokens: 5, TotalTokens: 15},
		LatencyMS:         123,
	})
	if err != nil {
		t.Fatalf("send callback: %v", err)
	}

	if received["tenantId"] != "tenant-1" {
		t.Fatalf("unexpected tenant: %#v", received)
	}
	if received["executionRequestId"] != "exec-request-1" {
		t.Fatalf("unexpected execution request: %#v", received)
	}
	if received["runtimeExecutionId"] != "runtime-exec-1" {
		t.Fatalf("unexpected runtime execution id: %#v", received)
	}
	if received["status"] != "SUCCEEDED" {
		t.Fatalf("unexpected status: %#v", received)
	}
	output, ok := received["output"].(map[string]any)
	if !ok {
		t.Fatalf("expected output object: %#v", received)
	}
	if output["provider"] != "openai" || output["model"] != "gpt-test" {
		t.Fatalf("unexpected provider output: %#v", output)
	}
	if received["traceId"] != "trace-1" {
		t.Fatalf("unexpected trace id: %#v", received)
	}
}

func TestSenderRequiresExecutionRequestID(t *testing.T) {
	sender := NewSender("platform", "secret", telemetry.NewLogger())
	err := sender.Send(context.Background(), contracts.ExecutionRequest{
		TenantID: "tenant-1",
		Module:   "pulse",
		Callback: &contracts.ExecutionCallback{URL: "https://platform.example/v1/runtime/results"},
	}, contracts.ExecutionResponse{Status: contracts.StatusSucceeded})
	if err == nil {
		t.Fatal("expected error")
	}
}
