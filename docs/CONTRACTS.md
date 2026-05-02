# Contracts Package

`packages/contracts` contains framework-neutral TypeScript contracts shared by API, web, and queue code.

## Rules

- Do not import NestJS, Next.js, React, Prisma, or database client types.
- Do not expose database implementation details.
- Prefer stable API-facing shapes over internal persistence shapes.
- Queue payloads should live here when workers and API producers both use them.
- Breaking changes should be coordinated with API and web updates in the same pull request.

## Current Coverage

- Tenants
- Users/auth session
- Agents
- Conversations
- Messages
- Channels
- AI responses, lead extraction, and intent classification
- Billing status
- Queue job payloads
