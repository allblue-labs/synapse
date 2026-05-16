# Frontend Architecture

This document captures structural choices for the Synapse web client that
operators and future ICs need to understand before touching the codebase.
Operational narrative (what shipped per stage) lives in
[`UX_ARCHITECTURE.md`](./UX_ARCHITECTURE.md); this file is a stable reference.

The codebase organises itself around three layered concerns:

1. **Tokens** — Tailwind config + `app/globals.css`. Surface scale, motion,
   typography, focus rings.
2. **Primitives** — `components/ui/*` (`Sheet`, `StatusPill`, `InlineAction`,
   `Spinner`, `AnimatedNumber`, `Dialog`, `Toast`, `Skeleton`,
   `LoadState`). Reusable, no business logic.
3. **Surfaces** — route-level pages and surface-specific components.

The platform has four shells, each with its own route group:

| Group           | Path prefix         | Layout                                        |
|-----------------|---------------------|-----------------------------------------------|
| `(marketing)`   | `/`, `/pricing`     | Public marketing chrome                       |
| `(auth)`        | `/login`            | Auth shell                                    |
| `(workspace)`   | `/workspace/*`      | Tenant workspace (top-nav + sidebar)          |
| `(platform)`    | `/platform/*`       | Platform admin (indigo accent, sidebar)       |
| `(onboarding)`  | `/onboarding/*`     | Fullscreen tenant context profile flow       |

---

## Tenant Context Profile flow

The onboarding flow exists as a self-contained surface so it cannot accidentally
inherit workspace chrome. Activation rules:

- Triggered once per tenant after a subscription or module purchase is approved,
  if no approved `TenantContextProfile` exists.
- Backend exposes a `requiresProfile` boolean on `GET /tenant-context/status` —
  middleware-level enforcement is **pending** (page-level checks suffice today).
- After approval the flow never appears automatically again. Future modules
  (Pulse, etc.) collect their own context separately.

### Routes

| Route                                       | Step                | Component                            |
|---------------------------------------------|---------------------|--------------------------------------|
| `/onboarding/profile`                       | 1 · Introduction    | `ProfileIntroClient`                 |
| `/onboarding/profile/mode`                  | 2 · Mode selection  | `ModeSelectorClient`                 |
| `/onboarding/profile/session/[id]`          | 3 · Interview       | `InterviewClient`                    |
| `/onboarding/profile/manual`                | 4 · Manual form     | `ManualFormClient`                   |
| `/onboarding/profile/validation`            | 5 · Review/approve  | `ValidationClient`                   |

All pages call `loadStatus()` server-side and redirect:

- `APPROVED` → `/workspace/overview`
- `AWAITING_VALIDATION` → `/onboarding/profile/validation`
- Existing draft with `mode` set → resume the matching step

### Library layout

```
lib/
  api.ts                       api.tenantContext.* + typed records
  onboarding/
    loaders.ts                 loadStatus()
    actions.ts                 startProfile / saveAnswer / submitManualForm /
                               generateSummary / approveProfile / rejectProfile /
                               editAnswers
    sections.ts                Section model (business/communication/operational)
                               computeSectionProgress, completedFieldCount
    storage.ts                 localStorage interruption recovery (per tenantId)
components/onboarding/
  section-progress.tsx         Vertical timeline (shared by steps 3/4/5)
  intro-client.tsx
  mode-selector-client.tsx
  interview-client.tsx
  manual-form-client.tsx
  validation-client.tsx
```

### State flow

```
Status (RSC load)
   │
   ├─ APPROVED ──────────────────────→ /workspace/overview
   │
   ├─ AWAITING_VALIDATION ────────────→ /validation
   │
   └─ PENDING / IN_PROGRESS / REJECTED
        │
        Step 1 Intro ── CTA (resume-aware) ────→ Step 2 or correct resume step
        │
        Step 2 Mode (startProfile(LLM | MANUAL_FORM))
        │     │
        │     ├─ LLM ───────────────→ Step 3 Interview
        │     │                          loop saveAnswer until completed
        │     └─ MANUAL_FORM ──────→ Step 4 Manual form
        │                                debounced local autosave
        │                                final submitManualForm(body)
        │
        Step 5 Validation
            ├─ approveProfile() → success transition → /workspace/overview
            └─ rejectProfile(reason?) → returns to drafting (manual form)
```

### Validation rules

The page renders a summary read of the operator's draft and surfaces
required-field completeness from the backend executor:

- `summary.completeness.readyForApproval === true` → Approve enabled.
- `summary.completeness.missingFields` is rendered as an amber banner with
  the exact field keys, mirroring the backend contract.
- "Regenerate summary" re-calls `generateSummary` (audit-safe; idempotent).
- "Reject" prompts for optional reason and routes back to drafting.
- "Edit" jumps to the manual form, which resumes at the first incomplete
  section.

### Interaction rules (interview)

- Questions are presented as structured **question blocks**, answers as
  structured **answer blocks** — never as chat bubbles.
- The executor exposes one missing field at a time; the UI cannot ask
  unrelated questions.
- An inline notice (`onboarding.interview.offTopicNotice`) reinforces:
  "This setup only collects information required to configure your workspace."
- Audio upload is a placeholder until the transcription endpoint ships.

### Interruption recovery

`lib/onboarding/storage.ts` keeps a per-tenant local draft. On mount each
screen merges the local copy into the server response (`mergeDrafts(server,
local)`) so accidental refresh / brief offline does not lose unsubmitted text.
`clearDraft(tenantId)` runs on approve.

### i18n

`onboarding.*` keys exist in both `en` and `pt-br`. The `Messages` type in
`lib/i18n/messages/en.ts` is the canonical source — `pt-br.ts` is enforced
by TypeScript to match. Every operator-facing string in the flow is routed
through `useTranslator()`.

### Motion

All screens use the Stage-3 motion language:

- `animate-slide-up` for in-page reveals.
- `animate-panel-in` for shell-level entries (intro illustration, approve success).
- `animate-pulse-dot` for live indicators.
- `ease-snap` is the default transition curve.
- Reduced motion is honoured globally (`prefers-reduced-motion: reduce` short-circuits
  every keyframe to 1 ms).

### Responsive baseline

Layouts collapse cleanly to a single column on small screens. The timeline
stacks above the surface; the input dock stays anchored to the bottom. No
fixed-width centered containers — the canvas owns the viewport.

### Open contract dependencies

| Behaviour                                                | Dependency                                       |
|----------------------------------------------------------|--------------------------------------------------|
| Auto-redirect from workspace when `requiresProfile`      | middleware-level guard (pending)                 |
| Audio answer transcription                               | transcription endpoint (pending)                 |
| Real-time `nextQuestion` from LLM-backed executor        | runtime-backed executor (pending)                |
| Reading `latestSummary` without server-side regeneration | `latestSummary` payload on `status` (live)       |
