# Security Policy

## Dependency Audit Policy

`npm audit` currently reports findings in the dependency tree. Do not blindly run `npm audit fix --force`; it can introduce breaking upgrades.

Recommended process:

1. Run `npm audit --workspaces`.
2. Classify findings by severity, exploitability, runtime exposure, and whether they affect production code.
3. Prefer direct dependency upgrades over force fixes.
4. Record accepted temporary risk in this document or a security ticket.
5. Re-run build, lint, typecheck, and relevant tests after dependency changes.

Useful command:

```bash
npm audit --workspaces
```

## Secret Handling

- Keep secrets out of Git.
- Use `.env.example` only for names and safe defaults.
- Tenant provider credentials should be stored as references and encrypted/managed by a production secrets system.
- Frontend-exposed variables must use `NEXT_PUBLIC_` only when intentionally public.

## Webhook Security

- Validate channel and Stripe webhook signatures before mutation or queue enqueue.
- Use timestamps or nonce protections where providers support them.
- Store provider message IDs for idempotency.
- Log webhook failures without leaking secrets.

## Tenant Isolation Notes

- Tenant-owned data must include `tenantId`.
- Tenant scope comes from authenticated claims, not request bodies.
- Use `TenantPrismaService` or domain repositories for tenant-sensitive access.
- PostgreSQL Row Level Security should be evaluated before production scale.

## Rate Limiting Strategy

- API has a global baseline throttle.
- Auth endpoints have stricter throttles.
- Future tenant-based limits should include seats, monthly messages, AI usage, and channel throughput.

## Production Checklist

- Configure strong `JWT_SECRET`.
- Configure CORS origins explicitly.
- Enable provider webhook validation.
- Encrypt or externally manage tenant integration secrets.
- Add Stripe webhook idempotency.
- Add CI quality gates.
- Review `npm audit` findings before release.
