package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/allbluelabs/synapse-runtime/internal/callback"
	"github.com/allbluelabs/synapse-runtime/internal/execution"
	"github.com/allbluelabs/synapse-runtime/internal/providers"
	"github.com/allbluelabs/synapse-runtime/internal/providers/claude"
	"github.com/allbluelabs/synapse-runtime/internal/providers/openai"
	"github.com/allbluelabs/synapse-runtime/internal/security"
	"github.com/allbluelabs/synapse-runtime/internal/telemetry"
	httptransport "github.com/allbluelabs/synapse-runtime/internal/transport/http"
)

func main() {
	logger := telemetry.NewLogger()
	registry := providers.NewRegistry(
		openai.NewFromEnv(),
		claude.NewFromEnv(),
	)
	engine := execution.NewEngine(registry, logger, nil)
	server := runtimeServer(engine, logger)

	addr := os.Getenv("RUNTIME_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	httpServer := &http.Server{
		Addr:              addr,
		Handler:           server.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      130 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		logger.Info("runtime_started", map[string]any{"addr": addr})
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("runtime_listen_failed", map[string]any{"error": err.Error()})
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		logger.Error("runtime_shutdown_failed", map[string]any{"error": err.Error()})
		os.Exit(1)
	}
	logger.Info("runtime_stopped", nil)
}

func runtimeSecretsFromEnv() map[string]string {
	secret := os.Getenv("SYNAPSE_RUNTIME_SHARED_SECRET")
	keyID := os.Getenv("SYNAPSE_RUNTIME_KEY_ID")
	if keyID == "" {
		keyID = "platform"
	}
	return map[string]string{keyID: secret}
}

func runtimeServer(engine *execution.Engine, logger telemetry.Logger) *httptransport.Server {
	var callbackSender *callback.Sender
	if os.Getenv("SYNAPSE_RUNTIME_SHARED_SECRET") != "" {
		callbackSender = callback.NewSender(
			os.Getenv("SYNAPSE_RUNTIME_KEY_ID"),
			os.Getenv("SYNAPSE_RUNTIME_SHARED_SECRET"),
			logger,
		)
	}
	if os.Getenv("SYNAPSE_RUNTIME_ALLOW_UNSIGNED") == "1" {
		logger.Error("runtime_unsigned_requests_enabled", map[string]any{
			"warning": "development only; do not enable in production",
		})
		return httptransport.NewServer(
			engine,
			logger,
			httptransport.WithCallbackSender(callbackSender),
		)
	}
	if os.Getenv("SYNAPSE_RUNTIME_SHARED_SECRET") == "" {
		logger.Error("runtime_missing_shared_secret", map[string]any{
			"requiredEnv": "SYNAPSE_RUNTIME_SHARED_SECRET",
		})
		os.Exit(1)
	}
	return httptransport.NewServer(
		engine,
		logger,
		httptransport.WithSignatureVerifier(
			security.NewVerifier(runtimeSecretsFromEnv()),
		),
		httptransport.WithCallbackSender(callbackSender),
	)
}
