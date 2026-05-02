# Observability

Synapse now has production-oriented observability basics in the API.

## Logging

API logs are JSON lines emitted by `JsonLoggerService`.

Required fields when available:

- `timestamp`
- `service`
- `level`
- `message`
- `context`
- `requestId`
- `tenantId`
- `userId`
- `method`
- `path`
- `statusCode`
- `durationMs`

## Request Correlation

`RequestIdInterceptor` reads `x-request-id` when provided or generates a UUID. The value is returned in the `x-request-id` response header and included in request logs.

## Health Endpoints

- `GET /v1/health`: liveness-style health.
- `GET /v1/health/ready`: readiness check with database probe.
- `GET /v1/health/metadata`: service metadata for diagnostics.

## Kubernetes/Prometheus Path

The readiness endpoint prepares the API for Kubernetes readiness probes. Prometheus metrics are not implemented yet; planned metrics include request duration, job duration, queue depth, AI token usage, channel delivery failures, and webhook validation failures.
