package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const (
	HeaderKeyID     = "x-synapse-runtime-key-id"
	HeaderTimestamp = "x-synapse-runtime-timestamp"
	HeaderSignature = "x-synapse-runtime-signature"
	DefaultMaxSkew  = 5 * time.Minute
)

var (
	ErrMissingSignature = errors.New("runtime signature headers are required")
	ErrUnknownKey       = errors.New("runtime signature key is not configured")
	ErrInvalidTimestamp = errors.New("runtime signature timestamp is invalid")
	ErrExpiredSignature = errors.New("runtime signature timestamp is outside allowed skew")
	ErrInvalidSignature = errors.New("runtime signature is invalid")
)

type Verifier struct {
	secrets map[string]string
	now     func() time.Time
	maxSkew time.Duration
}

func NewVerifier(secrets map[string]string) Verifier {
	return Verifier{
		secrets: secrets,
		now:     time.Now,
		maxSkew: DefaultMaxSkew,
	}
}

func (v Verifier) Verify(r *http.Request, body []byte) error {
	keyID := r.Header.Get(HeaderKeyID)
	timestamp := r.Header.Get(HeaderTimestamp)
	signature := r.Header.Get(HeaderSignature)
	if keyID == "" || timestamp == "" || signature == "" {
		return ErrMissingSignature
	}

	secret := v.secrets[keyID]
	if secret == "" {
		return ErrUnknownKey
	}

	parsedTimestamp, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return ErrInvalidTimestamp
	}
	signedAt := time.Unix(parsedTimestamp, 0)
	now := v.now()
	if signedAt.After(now.Add(v.maxSkew)) || signedAt.Before(now.Add(-v.maxSkew)) {
		return ErrExpiredSignature
	}

	expected := Sign(secret, r.Method, r.URL.Path, timestamp, body)
	if !hmac.Equal([]byte(expected), []byte(strings.TrimPrefix(signature, "sha256="))) {
		return ErrInvalidSignature
	}
	return nil
}

func Sign(secret string, method string, path string, timestamp string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = io.WriteString(mac, fmt.Sprintf("%s\n%s\n%s\n", method, path, timestamp))
	_, _ = mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}
