package security

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestVerifierAcceptsValidSignature(t *testing.T) {
	body := []byte(`{"tenantId":"tenant-a"}`)
	request := httptest.NewRequest(http.MethodPost, "/executions", nil)
	timestamp := "1778241600"
	request.Header.Set(HeaderKeyID, "platform")
	request.Header.Set(HeaderTimestamp, timestamp)
	request.Header.Set(HeaderSignature, "sha256="+Sign("secret", request.Method, request.URL.Path, timestamp, body))

	verifier := NewVerifier(map[string]string{"platform": "secret"})
	verifier.now = func() time.Time { return time.Unix(1778241600, 0) }

	if err := verifier.Verify(request, body); err != nil {
		t.Fatalf("expected valid signature, got %v", err)
	}
}

func TestVerifierRejectsInvalidSignature(t *testing.T) {
	body := []byte(`{"tenantId":"tenant-a"}`)
	request := httptest.NewRequest(http.MethodPost, "/executions", nil)
	request.Header.Set(HeaderKeyID, "platform")
	request.Header.Set(HeaderTimestamp, "1778241600")
	request.Header.Set(HeaderSignature, "sha256=bad")

	verifier := NewVerifier(map[string]string{"platform": "secret"})
	verifier.now = func() time.Time { return time.Unix(1778241600, 0) }

	if err := verifier.Verify(request, body); err != ErrInvalidSignature {
		t.Fatalf("expected invalid signature, got %v", err)
	}
}

func TestVerifierRejectsExpiredSignature(t *testing.T) {
	body := []byte(`{"tenantId":"tenant-a"}`)
	request := httptest.NewRequest(http.MethodPost, "/executions", nil)
	request.Header.Set(HeaderKeyID, "platform")
	request.Header.Set(HeaderTimestamp, "1778241600")
	request.Header.Set(HeaderSignature, "sha256="+Sign("secret", request.Method, request.URL.Path, "1778241600", body))

	verifier := NewVerifier(map[string]string{"platform": "secret"})
	verifier.now = func() time.Time { return time.Unix(1778242600, 0) }

	if err := verifier.Verify(request, body); err != ErrExpiredSignature {
		t.Fatalf("expected expired signature, got %v", err)
	}
}
