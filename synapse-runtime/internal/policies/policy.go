package policies

import (
	"errors"
	"slices"
	"time"

	"github.com/allbluelabs/synapse-runtime/internal/contracts"
)

const (
	DefaultTimeout = 30 * time.Second
	MaxTimeout     = 120 * time.Second
	DefaultRetries = 1
	MaxRetries     = 3
)

type ResolvedPolicy struct {
	Timeout          time.Duration
	MaxRetries       int
	FallbackEnabled  bool
	AllowedProviders []string
}

func Resolve(request contracts.ExecutionRequest) (ResolvedPolicy, error) {
	timeout := DefaultTimeout
	if request.TimeoutMS > 0 {
		timeout = time.Duration(request.TimeoutMS) * time.Millisecond
	}
	if request.Policy.TimeoutMS > 0 {
		timeout = time.Duration(request.Policy.TimeoutMS) * time.Millisecond
	}
	if timeout > MaxTimeout {
		return ResolvedPolicy{}, errors.New("timeout exceeds runtime maximum")
	}

	retries := request.Policy.MaxRetries
	if retries == 0 {
		retries = DefaultRetries
	}
	if retries < 0 || retries > MaxRetries {
		return ResolvedPolicy{}, errors.New("maxRetries outside supported range")
	}

	return ResolvedPolicy{
		Timeout:          timeout,
		MaxRetries:       retries,
		FallbackEnabled:  request.Policy.FallbackEnabled,
		AllowedProviders: request.Policy.AllowedProviders,
	}, nil
}

func ProviderAllowed(policy ResolvedPolicy, provider string) bool {
	if len(policy.AllowedProviders) == 0 {
		return true
	}
	return slices.Contains(policy.AllowedProviders, provider)
}
