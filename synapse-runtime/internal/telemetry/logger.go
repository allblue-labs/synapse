package telemetry

import (
	"encoding/json"
	"log/slog"
	"os"
	"strings"
)

type Logger struct {
	base *slog.Logger
}

func NewLogger() Logger {
	return Logger{base: slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{}))}
}

func (l Logger) Info(message string, attrs map[string]any) {
	l.base.Info(message, slog.Any("metadata", mask(attrs)))
}

func (l Logger) Error(message string, attrs map[string]any) {
	l.base.Error(message, slog.Any("metadata", mask(attrs)))
}

func mask(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := map[string]any{}
		for key, item := range typed {
			if sensitive(key) {
				out[key] = "[REDACTED]"
				continue
			}
			out[key] = mask(item)
		}
		return out
	case []any:
		out := make([]any, len(typed))
		for i, item := range typed {
			out[i] = mask(item)
		}
		return out
	default:
		return typed
	}
}

func sensitive(key string) bool {
	normalized := strings.ToLower(key)
	for _, marker := range []string{"secret", "token", "password", "credential", "apikey", "authorization", "prompt", "chainofthought", "reasoning"} {
		if strings.Contains(normalized, marker) {
			return true
		}
	}
	return false
}

func MaskForJSON(value any) json.RawMessage {
	data, _ := json.Marshal(mask(value))
	return data
}
