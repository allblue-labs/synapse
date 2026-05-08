package fake

import (
	"context"

	"github.com/allbluelabs/synapse-runtime/internal/contracts"
	"github.com/allbluelabs/synapse-runtime/internal/providers"
)

type Provider struct {
	NameValue string
	Output    string
	Err       error
}

func (p Provider) Name() string { return p.NameValue }

func (p Provider) Execute(context.Context, contracts.ExecutionRequest) (providers.ProviderResponse, error) {
	if p.Err != nil {
		return providers.ProviderResponse{}, p.Err
	}
	return providers.ProviderResponse{
		Provider: p.NameValue,
		Model:    "fake-model",
		Output:   p.Output,
	}, nil
}

func (p Provider) Stream(context.Context, contracts.ExecutionRequest) (<-chan providers.ProviderStreamEvent, error) {
	ch := make(chan providers.ProviderStreamEvent, 1)
	ch <- providers.ProviderStreamEvent{Delta: p.Output, Done: true}
	close(ch)
	return ch, nil
}

func (p Provider) Health(context.Context) error { return p.Err }

func (p Provider) Models(context.Context) ([]string, error) {
	return []string{"fake-model"}, p.Err
}
