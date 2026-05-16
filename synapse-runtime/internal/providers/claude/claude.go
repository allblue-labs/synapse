package claude

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
	baseURL := os.Getenv("ANTHROPIC_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.anthropic.com/v1"
	}
	return &Client{
		apiKey:  os.Getenv("ANTHROPIC_API_KEY"),
		baseURL: baseURL,
		client:  &http.Client{Timeout: 60 * time.Second},
	}
}

func (c *Client) Name() string { return "claude" }

func (c *Client) Execute(ctx context.Context, request contracts.ExecutionRequest) (providers.ProviderResponse, error) {
	if c.apiKey == "" {
		return providers.ProviderResponse{}, errors.New("anthropic api key is not configured")
	}

	model := request.ModelPreference
	if model == "" {
		model = "claude-3-5-haiku-latest"
	}
	system, messages := messages(request.Input)
	payload := messagesRequest{
		Model:     model,
		MaxTokens: 1024,
		System:    system,
		Messages:  messages,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return providers.ProviderResponse{}, err
	}

	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/messages", bytes.NewReader(body))
	if err != nil {
		return providers.ProviderResponse{}, err
	}
	httpRequest.Header.Set("x-api-key", c.apiKey)
	httpRequest.Header.Set("anthropic-version", "2023-06-01")
	httpRequest.Header.Set("Content-Type", "application/json")

	httpResponse, err := c.client.Do(httpRequest)
	if err != nil {
		return providers.ProviderResponse{}, err
	}
	defer httpResponse.Body.Close()

	if httpResponse.StatusCode >= 300 {
		return providers.ProviderResponse{}, fmt.Errorf("anthropic returned status %d", httpResponse.StatusCode)
	}

	var decoded messagesResponse
	if err := json.NewDecoder(httpResponse.Body).Decode(&decoded); err != nil {
		return providers.ProviderResponse{}, err
	}

	output := ""
	for _, block := range decoded.Content {
		if block.Type == "text" {
			output += block.Text
		}
	}
	if output == "" {
		return providers.ProviderResponse{}, errors.New("anthropic returned no text content")
	}

	return providers.ProviderResponse{
		Provider: "claude",
		Model:    model,
		Output:   output,
		Usage: contracts.Usage{
			InputTokens:  decoded.Usage.InputTokens,
			OutputTokens: decoded.Usage.OutputTokens,
			TotalTokens:  decoded.Usage.InputTokens + decoded.Usage.OutputTokens,
		},
	}, nil
}

func (c *Client) Stream(context.Context, contracts.ExecutionRequest) (<-chan providers.ProviderStreamEvent, error) {
	return nil, errors.New("claude streaming is not implemented in stage 1")
}

func (c *Client) Health(context.Context) error {
	if c.apiKey == "" {
		return errors.New("anthropic api key is not configured")
	}
	return nil
}

func (c *Client) Models(context.Context) ([]string, error) {
	return []string{"claude-3-5-haiku-latest", "claude-3-5-sonnet-latest"}, nil
}

func messages(input contracts.ExecutionInput) (string, []message) {
	if len(input.Messages) > 0 {
		out := make([]message, 0, len(input.Messages))
		system := ""
		for _, item := range input.Messages {
			if item.Role == "system" {
				if system != "" {
					system += "\n\n"
				}
				system += item.Content
				continue
			}
			role := item.Role
			if role == "assistant" {
				role = "assistant"
			} else {
				role = "user"
			}
			out = append(out, message{Role: role, Content: item.Content})
		}
		if len(out) == 0 && system != "" {
			out = append(out, message{Role: "user", Content: "Execute the system instruction."})
		}
		return system, out
	}
	return "", []message{{Role: "user", Content: input.Prompt}}
}

type messagesRequest struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	System    string    `json:"system,omitempty"`
	Messages  []message `json:"messages"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type messagesResponse struct {
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Usage struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}
