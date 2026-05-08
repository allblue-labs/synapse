package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/allbluelabs/synapse-runtime/internal/contracts"
	"github.com/allbluelabs/synapse-runtime/internal/providers"
)

type Client struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

func NewFromEnv() *Client {
	baseURL := os.Getenv("OPENAI_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	return &Client{
		apiKey:  os.Getenv("OPENAI_API_KEY"),
		baseURL: baseURL,
		client:  &http.Client{Timeout: 60 * time.Second},
	}
}

func (c *Client) Name() string { return "openai" }

func (c *Client) Execute(ctx context.Context, request contracts.ExecutionRequest) (providers.ProviderResponse, error) {
	if c.apiKey == "" {
		return providers.ProviderResponse{}, errors.New("openai api key is not configured")
	}

	model := request.ModelPreference
	if model == "" {
		model = "gpt-4.1-mini"
	}
	payload := chatRequest{
		Model:    model,
		Messages: messages(request.Input),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return providers.ProviderResponse{}, err
	}

	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return providers.ProviderResponse{}, err
	}
	httpRequest.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpRequest.Header.Set("Content-Type", "application/json")

	httpResponse, err := c.client.Do(httpRequest)
	if err != nil {
		return providers.ProviderResponse{}, err
	}
	defer httpResponse.Body.Close()

	if httpResponse.StatusCode >= 300 {
		return providers.ProviderResponse{}, fmt.Errorf("openai returned status %d", httpResponse.StatusCode)
	}

	var decoded chatResponse
	if err := json.NewDecoder(httpResponse.Body).Decode(&decoded); err != nil {
		return providers.ProviderResponse{}, err
	}
	if len(decoded.Choices) == 0 {
		return providers.ProviderResponse{}, errors.New("openai returned no choices")
	}

	return providers.ProviderResponse{
		Provider: "openai",
		Model:    model,
		Output:   decoded.Choices[0].Message.Content,
		Usage: contracts.Usage{
			InputTokens:  decoded.Usage.PromptTokens,
			OutputTokens: decoded.Usage.CompletionTokens,
			TotalTokens:  decoded.Usage.TotalTokens,
		},
	}, nil
}

func (c *Client) Stream(context.Context, contracts.ExecutionRequest) (<-chan providers.ProviderStreamEvent, error) {
	return nil, errors.New("openai streaming is not implemented in stage 1")
}

func (c *Client) Health(context.Context) error {
	if c.apiKey == "" {
		return errors.New("openai api key is not configured")
	}
	return nil
}

func (c *Client) Models(context.Context) ([]string, error) {
	return []string{"gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"}, nil
}

func messages(input contracts.ExecutionInput) []chatMessage {
	if len(input.Messages) > 0 {
		out := make([]chatMessage, len(input.Messages))
		for i, message := range input.Messages {
			out[i] = chatMessage{Role: message.Role, Content: message.Content}
		}
		return out
	}
	return []chatMessage{{Role: "user", Content: input.Prompt}}
}

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}
