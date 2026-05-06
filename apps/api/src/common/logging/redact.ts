/**
 * Redaction utilities — scrub sensitive values before they hit the JSON log
 * sink. Applied centrally inside `JsonLoggerService.write()` so every log
 * line — including those produced by the exception filter — is sanitised.
 *
 * Two layers:
 *   1. Object-key matching (deep, recursive) — replaces values whose keys
 *      look like credentials, e.g. `{ authorization: 'Bearer abc' }`
 *   2. String pattern scrub — catches secrets inlined into stack traces
 *      and free-form messages, e.g. `Bearer eyJ...`, `password=hunter2`.
 */

const REDACTED = '[REDACTED]';

/** Keys whose values are always redacted (case-insensitive). */
const SENSITIVE_KEY = /^(password|passwordhash|authorization|cookie|set-cookie|token|secret|apikey|api[-_]?key|jwt|access[-_]?token|refresh[-_]?token|client[-_]?secret|x-tenant-token)$/i;

/** String patterns that must be scrubbed in free-form text (stack traces, messages). */
const STRING_REDACTIONS: ReadonlyArray<{pattern: RegExp; replace: string}> = [
  // Bearer tokens (JWT or opaque): "Authorization: Bearer eyJ..." or just "Bearer eyJ..."
  {pattern: /(\bBearer\s+)[A-Za-z0-9._\-+/=]{6,}/gi, replace: `$1${REDACTED}`},
  // Generic key=value: password=..., token=..., apiKey=..., api_key=...
  {pattern: /\b(password|token|api[-_]?key|secret|access[-_]?token|refresh[-_]?token)\s*[:=]\s*['"]?[^'"\s,;}]+/gi, replace: `$1=${REDACTED}`},
  // JSON form: "password":"...", "token":"..."
  {pattern: /(\b(?:password|token|api[-_]?key|secret|access[-_]?token|refresh[-_]?token)\b\s*"\s*:\s*")(?:[^"\\]|\\.)+(")/gi, replace: `$1${REDACTED}$2`},
];

/**
 * Recursively redact an arbitrary value. Strings are pattern-scrubbed,
 * objects/arrays walked, and known-sensitive keys replaced wholesale.
 *
 * Cycle-safe up to a configurable depth (default 8) to bound work and
 * avoid pathological self-referential structures. Beyond the depth the
 * value is summarised as `[Truncated]`.
 */
export function redact(value: unknown, depth = 8): unknown {
  if (depth < 0) return '[Truncated]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return scrubString(value);
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Error) {
    // Errors don't enumerate `message`/`stack` via spread. Build a plain object.
    return {
      name:    value.name,
      message: scrubString(value.message),
      stack:   value.stack ? scrubString(value.stack) : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth - 1));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(k)) {
      out[k] = REDACTED;
    } else {
      out[k] = redact(v, depth - 1);
    }
  }
  return out;
}

/** Apply free-form-text redactions to a single string. */
function scrubString(input: string): string {
  let out = input;
  for (const {pattern, replace} of STRING_REDACTIONS) {
    out = out.replace(pattern, replace);
  }
  return out;
}
