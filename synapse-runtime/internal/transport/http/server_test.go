package httptransport

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

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
