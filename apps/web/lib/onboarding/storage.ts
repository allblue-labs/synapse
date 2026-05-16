/**
 * Client-side interruption recovery for the onboarding flow.
 *
 *   - Saves an in-progress draft locally so a refresh / reload / accidental
 *     navigation doesn't lose unsubmitted answers.
 *   - Backend remains the source of truth — each answer is also sent via
 *     Server Action. Local storage is a fallback for cases the operator
 *     was offline when typing, or the action call failed in flight.
 *   - Keyed by `tenantId` so a multi-tenant browser session never crosses
 *     drafts.
 */

const KEY_PREFIX = 'synapse.onboarding.draft';

export interface LocalDraft {
  answers: Record<string, unknown>;
  mode: 'LLM' | 'MANUAL_FORM' | null;
  /** Step within the manual-form wizard, when relevant. */
  manualStep?: string;
  /** ISO timestamp of the last local save. */
  updatedAt: string;
}

function keyFor(tenantId: string): string {
  return `${KEY_PREFIX}.${tenantId}`;
}

export function readDraft(tenantId: string): LocalDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(keyFor(tenantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as Partial<LocalDraft>;
    if (typeof obj.answers !== 'object' || obj.answers === null) return null;
    return {
      answers: obj.answers as Record<string, unknown>,
      mode: obj.mode === 'LLM' || obj.mode === 'MANUAL_FORM' ? obj.mode : null,
      manualStep: typeof obj.manualStep === 'string' ? obj.manualStep : undefined,
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeDraft(tenantId: string, draft: Omit<LocalDraft, 'updatedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      keyFor(tenantId),
      JSON.stringify({...draft, updatedAt: new Date().toISOString()}),
    );
  } catch {
    // localStorage may be unavailable (private mode, quota). Best effort.
  }
}

export function clearDraft(tenantId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(keyFor(tenantId));
  } catch {
    // Best effort.
  }
}

/**
 * Merge a server draft with the local draft.
 *
 *   - Server answers win for fields it already has.
 *   - Local answers fill in fields the server hasn't seen yet (uncommitted
 *     edits the user typed before disconnecting).
 */
export function mergeDrafts(
  server: Record<string, unknown>,
  local: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!local) return server;
  const out: Record<string, unknown> = {...server};
  for (const [k, v] of Object.entries(local)) {
    if (!(k in out) || out[k] == null || out[k] === '') out[k] = v;
  }
  return out;
}
