package providers

import (
	"context"

	"github.com/allbluelabs/synapse-runtime/internal/contracts"
)

type Provider interface {
	Name() string
	Execute(context.Context, contracts.ExecutionRequest) (ProviderResponse, error)
	Stream(context.Context, contracts.ExecutionRequest) (<-chan ProviderStreamEvent, error)
	Health(context.Context) error
	Models(context.Context) ([]string, error)
}

type ProviderResponse struct {
	Provider          string
	Model             string
	Output            string
	StructuredPayload map[string]any
	Usage             contracts.Usage
	Metadata          map[string]any
}

type ProviderStreamEvent struct {
	Delta string
	Done  bool
	Error string
}

type Registry struct {
	providers map[string]Provider
	order     []string
}

func NewRegistry(items ...Provider) *Registry {
	registry := &Registry{providers: map[string]Provider{}}
	for _, item := range items {
		if item == nil {
			continue
		}
		name := item.Name()
		registry.providers[name] = item
		registry.order = append(registry.order, name)
	}
	return registry
}

func (r *Registry) Get(name string) (Provider, bool) {
	provider, ok := r.providers[name]
	return provider, ok
}

func (r *Registry) Names() []string {
	names := make([]string, len(r.order))
	copy(names, r.order)
	return names
}

func (r *Registry) Providers() []Provider {
	items := make([]Provider, 0, len(r.order))
	for _, name := range r.order {
		items = append(items, r.providers[name])
	}
	return items
}
