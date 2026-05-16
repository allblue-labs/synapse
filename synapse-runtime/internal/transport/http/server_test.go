package httptransport

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/allbluelabs/synapse-runtime/internal/callback"
	"github.com/allbluelabs/synapse-runtime/internal/contracts"
	"github.com/allbluelabs/synapse-runtime/internal/execution"
	"github.com/allbluelabs/synapse-runtime/internal/providers"
	"github.com/allbluelabs/synapse-runtime/internal/providers/fake"
	"github.com/allbluelabs/synapse-runtime/internal/security"
	"github.com/allbluelabs/synapse-runtime/internal/telemetry"
)

type fixedID struct{}

func (fixedID) NewID() string { return "exec-http-test" }

func TestExecutions(t *testing.T) {
	engine := execution.NewEngine(
		providers.NewRegistry(fake.Provider{NameValue: "openai", Output: "done"}),
		telemetry.NewLogger(),
		fixedID{},
	)
	server := NewServer(engine, telemetry.NewLogger())

	body := bytes.NewBufferString(`{
		"tenantId":"tenant-a",
		"module":"pulse",
		"providerPreference":["openai"],
		"input":{"prompt":"safe summary"}
	}`)
	request := httptest.NewRequest(http.MethodPost, "/executions", body)
	response := httptest.NewRecorder()

	server.Handler().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", response.Code, response.Body.String())
	}
	if !bytes.Contains(response.Body.Bytes(), []byte(`"executionId":"exec-http-test"`)) {
		t.Fatalf("expected execution id in response: %s", response.Body.String())
	}
}

func TestExecutionsAcceptAsyncCallbackRequest(t *testing.T) {
	callbackReceived := make(chan map[string]any, 1)
	callbackServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read callback body: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		if err := security.NewVerifier(map[string]string{"platform": "secret"}).Verify(r, body); err != nil {
			t.Errorf("verify callback signature: %v", err)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		var payload map[string]any
		if err := json.Unmarshal(body, &payload); err != nil {
			t.Errorf("unmarshal callback body: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		callbackReceived <- payload
		w.WriteHeader(http.StatusAccepted)
	}))
	defer callbackServer.Close()

	engine := execution.NewEngine(
		providers.NewRegistry(fake.Provider{NameValue: "openai", Output: `{"decisionSummary":"ok"}`}),
		telemetry.NewLogger(),
		fixedID{},
	)
	server := NewServer(
		engine,
		telemetry.NewLogger(),
		WithCallbackSender(callback.NewSender("platform", "secret", telemetry.NewLogger())),
	)

	body := bytes.NewBufferString(`{
		"tenantId":"tenant-a",
		"module":"pulse",
		"providerPreference":["openai"],
		"structuredOutput":{"format":"json_schema","schema":{"type":"object"}},
		"input":{"prompt":"safe summary"},
		"context":{"traceId":"trace-async"},
		"metadata":{"executionRequestId":"exec-request-1"},
		"callback":{"async":true,"url":"` + callbackServer.URL + `/v1/runtime/results","maxRetries":1}
	}`)
	request := httptest.NewRequest(http.MethodPost, "/executions", body)
	response := httptest.NewRecorder()

	server.Handler().ServeHTTP(response, request)

	if response.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", response.Code, response.Body.String())
	}
	if !bytes.Contains(response.Body.Bytes(), []byte(`"status":"accepted"`)) {
		t.Fatalf("expected accepted response: %s", response.Body.String())
	}

	select {
	case payload := <-callbackReceived:
		if payload["tenantId"] != "tenant-a" || payload["executionRequestId"] != "exec-request-1" {
			t.Fatalf("unexpected callback payload: %#v", payload)
		}
		if payload["status"] != "SUCCEEDED" || payload["traceId"] != "trace-async" {
			t.Fatalf("unexpected callback result: %#v", payload)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("expected async callback")
	}
}

func TestExecutionsRejectAsyncCallbackWithoutSender(t *testing.T) {
	engine := execution.NewEngine(
		providers.NewRegistry(fake.Provider{NameValue: "openai", Output: "done"}),
		telemetry.NewLogger(),
		fixedID{},
	)
	server := NewServer(engine, telemetry.NewLogger())
	request := httptest.NewRequest(http.MethodPost, "/executions", bytes.NewBufferString(`{
		"tenantId":"tenant-a",
		"module":"pulse",
		"input":{"prompt":"safe summary"},
		"metadata":{"executionRequestId":"exec-request-1"},
		"callback":{"async":true,"url":"https://platform.example/v1/runtime/results"}
	}`))
	response := httptest.NewRecorder()

	server.Handler().ServeHTTP(response, request)

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d: %s", response.Code, response.Body.String())
	}
}

func TestExecutionsRequireValidSignatureWhenVerifierConfigured(t *testing.T) {
	engine := execution.NewEngine(
		providers.NewRegistry(fake.Provider{NameValue: "openai", Output: "done"}),
		telemetry.NewLogger(),
		fixedID{},
	)
	server := NewServer(
		engine,
		telemetry.NewLogger(),
		WithSignatureVerifier(security.NewVerifier(map[string]string{"platform": "secret"})),
	)

	body := []byte(`{"tenantId":"tenant-a","module":"pulse","input":{"prompt":"safe summary"}}`)
	request := httptest.NewRequest(http.MethodPost, "/executions", bytes.NewReader(body))
	response := httptest.NewRecorder()

	server.Handler().ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unsigned execution request, got %d", response.Code)
	}
}

func TestExecutionsAcceptSignedRequest(t *testing.T) {
	engine := execution.NewEngine(
		providers.NewRegistry(fake.Provider{NameValue: "openai", Output: "done"}),
		telemetry.NewLogger(),
		fixedID{},
	)
	server := NewServer(
		engine,
		telemetry.NewLogger(),
		WithSignatureVerifier(security.NewVerifier(map[string]string{"platform": "secret"})),
	)

	body := []byte(`{"tenantId":"tenant-a","module":"pulse","input":{"prompt":"safe summary"}}`)
	timestamp := strconv.FormatInt(time.Now().UTC().Unix(), 10)
	request := httptest.NewRequest(http.MethodPost, "/executions", bytes.NewReader(body))
	request.Header.Set(security.HeaderKeyID, "platform")
	request.Header.Set(security.HeaderTimestamp, timestamp)
	request.Header.Set(
		security.HeaderSignature,
		"sha256="+security.Sign("secret", request.Method, request.URL.Path, timestamp, body),
	)
	response := httptest.NewRecorder()

	server.Handler().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected 200 for signed request, got %d: %s", response.Code, response.Body.String())
	}
}

func TestProviders(t *testing.T) {
	engine := execution.NewEngine(
		providers.NewRegistry(fake.Provider{NameValue: "openai"}),
		telemetry.NewLogger(),
		fixedID{},
	)
	server := NewServer(engine, telemetry.NewLogger())
	request := httptest.NewRequest(http.MethodGet, "/providers", nil)
	response := httptest.NewRecorder()

	server.Handler().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", response.Code)
	}
}

func TestExecutionValidationFailure(t *testing.T) {
	engine := execution.NewEngine(providers.NewRegistry(), telemetry.NewLogger(), fixedID{})
	server := NewServer(engine, telemetry.NewLogger())
	request := httptest.NewRequest(http.MethodPost, "/executions", bytes.NewBufferString(`{"module":"pulse","input":{"prompt":"hello"}}`))
	response := httptest.NewRecorder()

	server.Handler().ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for failed validation response, got %d", response.Code)
	}
	if !bytes.Contains(response.Body.Bytes(), []byte(contracts.StatusFailed)) {
		t.Fatalf("expected failed status: %s", response.Body.String())
	}
}
