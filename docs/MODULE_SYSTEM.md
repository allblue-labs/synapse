# Module System

Synapse core is domain-neutral. Business capabilities are delivered by modules.

## Core Owns

- LLM pool and routing.
- Prompt engine and context/memory foundation.
- Task and workflow orchestration.
- Module lifecycle, permissions, actions, events, and contracts.
- Observability and per-tenant visibility.

## Modules Own

- Domain concepts.
- Provider integrations.
- Module-specific state.
- Module actions and emitted events.

## Current Contract

Backend modules implement:

```ts
interface SynapseModule {
  name: string;
  displayName: string;
  version: string;
  description: string;
  register(core: SynapseCoreService): void | Promise<void>;
  actions: ModuleAction[];
  events?: ModuleEvent[];
  permissions?: string[];
}
```

Shared manifest/action/event shapes live in `packages/contracts`.

## Current Modules

- `messaging`: channel messaging, conversations, normalization, lead capture, and conversation state.

## Boundary Rule

Messaging, incidents, inventory, and workforce must not enter core. If core needs a new capability, it should be a generic primitive useful across modules.

## Runtime Coordination

When modules are enabled or disabled, Synapse updates a tenant runtime spec. Today this is stored in memory and sent to a stub Pain client. Later the same flow will apply specs to Pain Runtime Operator.
