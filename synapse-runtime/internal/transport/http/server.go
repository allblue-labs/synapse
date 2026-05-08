package httptransport

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/allbluelabs/synapse-runtime/internal/contracts"
	"github.com/allbluelabs/synapse-runtime/internal/execution"
	"github.com/allbluelabs/synapse-runtime/internal/security"
	"github.com/allbluelabs/synapse-runtime/internal/telemetry"
)

type Server struct {
	engine   *execution.Engine
	logger   telemetry.Logger
	verifier *security.Verifier
	mux      *http.ServeMux
}

type Option func(*Server)

func WithSignatureVerifier(verifier security.Verifier) Option {
	return func(server *Server) {
		server.verifier = &verifier
	}
}

func NewServer(engine *execution.Engine, logger telemetry.Logger, options ...Option) *Server {
	server := &Server{
		engine: engine,
		logger: logger,
		mux:    http.NewServeMux(),
	}
	for _, option := range options {
		option(server)
	}
	server.routes()
	return server
}

func (s *Server) Handler() http.Handler {
	return s.recover(s.requestID(s.mux))
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /health", s.health)
	s.mux.HandleFunc("GET /providers", s.providers)
	s.mux.HandleFunc("GET /models", s.models)
	s.mux.HandleFunc("POST /executions", s.executions)
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":    "ok",
		"service":   "synapse-runtime",
		"timestamp": time.Now().UTC(),
	})
}

func (s *Server) providers(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.engine.Providers(r.Context()))
}

func (s *Server) models(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.engine.Models(r.Context()))
}

func (s *Server) executions(w http.ResponseWriter, r *http.Request) {
	if r.Body == nil {
		writeJSON(w, http.StatusBadRequest, errorResponse("request body is required"))
		return
	}
	defer r.Body.Close()

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse("execution request body is too large or unreadable"))
		return
	}
	if s.verifier != nil {
		if err := s.verifier.Verify(r, body); err != nil {
			s.logger.Error("runtime_signature_rejected", map[string]any{
				"path":  r.URL.Path,
				"error": err.Error(),
			})
			writeJSON(w, http.StatusUnauthorized, errorResponse("invalid runtime signature"))
			return
		}
	}

	var request contracts.ExecutionRequest
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse("invalid execution request"))
		return
	}

	if request.Context.TraceID == "" {
		request.Context.TraceID = r.Header.Get("x-request-id")
	}

	response := s.engine.Execute(r.Context(), request)
	if response.Status == contracts.StatusSucceeded {
		writeJSON(w, http.StatusOK, response)
		return
	}
	if response.Retry.Attempts == 0 {
		writeJSON(w, http.StatusBadRequest, response)
		return
	}
	writeJSON(w, http.StatusBadGateway, response)
}

func (s *Server) requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("x-request-id")
		if requestID == "" {
			requestID = time.Now().UTC().Format("20060102150405.000000000")
		}
		w.Header().Set("x-request-id", requestID)
		next.ServeHTTP(w, r)
	})
}

func (s *Server) recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if value := recover(); value != nil {
				s.logger.Error("panic_recovered", map[string]any{
					"path":  r.URL.Path,
					"panic": value,
					"stack": string(debug.Stack()),
				})
				writeJSON(w, http.StatusInternalServerError, errorResponse("internal runtime error"))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func errorResponse(message string) map[string]string {
	return map[string]string{"error": message}
}
