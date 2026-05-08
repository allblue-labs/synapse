'use server';

/**
 * Pulse ticket lifecycle — Next.js Server Actions.
 *
 *   - Form-action friendly: each action accepts a `FormData` *or* a
 *     typed object so it can be wired with `<form action={...}>` or
 *     called from a client component via `await action(input)`.
 *   - Returns a typed `ActionResult<T>` instead of throwing, so the
 *     UI always has a structured outcome to render (toast / inline).
 *   - On success, revalidates the ticket detail + tickets list paths
 *     so RSC re-renders pick up the new state.
 *   - Permissions are still enforced *server-side* by the API; these
 *     actions just relay user intent through `api.pulse.*`. UI gating
 *     via `<Can>` is purely an affordance.
 */

import {revalidatePath} from 'next/cache';
import {api, ApiError, type PulseTicketDetailRecord, type PulseFlowState, PULSE_FLOW_STATES} from '@/lib/api';

export type ActionResult<T = void> =
  | {kind: 'ok'; data: T}
  | {kind: 'forbidden'; message: string}
  | {kind: 'invalid'; message: string; details?: unknown}
  | {kind: 'error'; message: string; status: number};

interface ActionInput {
  ticketId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function strFromFormOrObject(input: FormData | object | undefined, key: string): string | undefined {
  if (!input) return undefined;
  if (input instanceof FormData) {
    const v = input.get(key);
    return typeof v === 'string' && v.length > 0 ? v : undefined;
  }
  const v = (input as Record<string, unknown>)[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function numFromFormOrObject(input: FormData | object | undefined, key: string): number | undefined {
  if (!input) return undefined;
  const raw = input instanceof FormData ? input.get(key) : (input as Record<string, unknown>)[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return undefined;
}

function boolFromFormOrObject(input: FormData | object | undefined, key: string): boolean | undefined {
  if (!input) return undefined;
  const raw = input instanceof FormData ? input.get(key) : (input as Record<string, unknown>)[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    if (raw === 'true' || raw === 'on' || raw === '1') return true;
    if (raw === 'false' || raw === 'off' || raw === '0') return false;
  }
  return undefined;
}

function revalidateTicket(ticketId: string) {
  revalidatePath(`/workspace/modules/pulse/tickets/${ticketId}`);
  revalidatePath(`/workspace/modules/pulse/tickets`);
  revalidatePath(`/workspace/modules/pulse/inbox`);
}

function mapError(err: unknown): ActionResult<never> {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return {kind: 'forbidden', message: err.message || 'You don’t have permission for this action.'};
    }
    if (err.status === 400) {
      return {kind: 'invalid', message: err.message, details: err.payload};
    }
    return {kind: 'error', status: err.status, message: err.message};
  }
  return {
    kind: 'error',
    status: 0,
    message: err instanceof Error ? err.message : 'Unknown error.',
  };
}

// ─── Lifecycle commands ─────────────────────────────────────────────

export async function assignTicket(
  input: ActionInput & {assignedUserId: string; note?: string} | FormData,
): Promise<ActionResult<PulseTicketDetailRecord>> {
  const ticketId = strFromFormOrObject(input, 'ticketId');
  const assignedUserId = strFromFormOrObject(input, 'assignedUserId');
  const note = strFromFormOrObject(input, 'note');

  if (!ticketId)        return {kind: 'invalid', message: 'ticketId is required.'};
  if (!assignedUserId)  return {kind: 'invalid', message: 'assignedUserId is required.'};

  try {
    const data = await api.pulse.assignTicket(ticketId, {assignedUserId, note});
    revalidateTicket(ticketId);
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function resolveTicket(
  input: ActionInput & {resolutionSummary?: string} | FormData,
): Promise<ActionResult<PulseTicketDetailRecord>> {
  const ticketId = strFromFormOrObject(input, 'ticketId');
  const resolutionSummary = strFromFormOrObject(input, 'resolutionSummary');
  if (!ticketId) return {kind: 'invalid', message: 'ticketId is required.'};

  try {
    const data = await api.pulse.resolveTicket(ticketId, {resolutionSummary});
    revalidateTicket(ticketId);
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function reopenTicket(
  input: ActionInput & {reason?: string} | FormData,
): Promise<ActionResult<PulseTicketDetailRecord>> {
  const ticketId = strFromFormOrObject(input, 'ticketId');
  const reason = strFromFormOrObject(input, 'reason');
  if (!ticketId) return {kind: 'invalid', message: 'ticketId is required.'};

  try {
    const data = await api.pulse.reopenTicket(ticketId, {reason});
    revalidateTicket(ticketId);
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function escalateTicket(
  input: ActionInput & {reason?: string; priority?: number} | FormData,
): Promise<ActionResult<PulseTicketDetailRecord>> {
  const ticketId = strFromFormOrObject(input, 'ticketId');
  const reason = strFromFormOrObject(input, 'reason');
  const priority = numFromFormOrObject(input, 'priority');
  if (!ticketId) return {kind: 'invalid', message: 'ticketId is required.'};

  try {
    const data = await api.pulse.escalateTicket(ticketId, {reason, priority});
    revalidateTicket(ticketId);
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function cancelTicket(
  input: ActionInput & {reason?: string} | FormData,
): Promise<ActionResult<PulseTicketDetailRecord>> {
  const ticketId = strFromFormOrObject(input, 'ticketId');
  const reason = strFromFormOrObject(input, 'reason');
  if (!ticketId) return {kind: 'invalid', message: 'ticketId is required.'};

  try {
    const data = await api.pulse.cancelTicket(ticketId, {reason});
    revalidateTicket(ticketId);
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function submitOperatorReview(
  input:
    | (ActionInput & {summary?: string; confidence?: number; approved: boolean; category?: string})
    | FormData,
): Promise<ActionResult<PulseTicketDetailRecord>> {
  const ticketId = strFromFormOrObject(input, 'ticketId');
  const summary = strFromFormOrObject(input, 'summary');
  const confidence = numFromFormOrObject(input, 'confidence');
  const approved = boolFromFormOrObject(input, 'approved');
  const category = strFromFormOrObject(input, 'category');

  if (!ticketId)               return {kind: 'invalid', message: 'ticketId is required.'};
  if (typeof approved !== 'boolean') return {kind: 'invalid', message: 'approved (boolean) is required.'};

  try {
    const data = await api.pulse.submitOperatorReview(ticketId, {
      summary,
      confidence,
      decision: {approved, ...(category ? {category} : {})},
    });
    revalidateTicket(ticketId);
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function advanceFlowState(
  input:
    | (ActionInput & {nextState: PulseFlowState; transitionSource?: 'manual' | 'system'; confidence?: number; note?: string})
    | FormData,
): Promise<ActionResult<PulseTicketDetailRecord>> {
  const ticketId = strFromFormOrObject(input, 'ticketId');
  const nextState = strFromFormOrObject(input, 'nextState');
  const note = strFromFormOrObject(input, 'note');
  const confidence = numFromFormOrObject(input, 'confidence');
  const transitionSource = strFromFormOrObject(input, 'transitionSource') as 'manual' | 'system' | undefined;

  if (!ticketId)  return {kind: 'invalid', message: 'ticketId is required.'};
  if (!nextState) return {kind: 'invalid', message: 'nextState is required.'};
  if (!(PULSE_FLOW_STATES as ReadonlyArray<string>).includes(nextState)) {
    return {kind: 'invalid', message: `nextState must be one of: ${PULSE_FLOW_STATES.join(', ')}.`};
  }

  try {
    const data = await api.pulse.advanceFlowState(ticketId, {
      nextState: nextState as PulseFlowState,
      transitionSource: transitionSource ?? 'manual',
      confidence,
      note,
    });
    revalidateTicket(ticketId);
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}
