'use server';

/**
 * Onboarding Server Actions — mutations for the Tenant Context Profile flow.
 *
 * Each action returns a structured `ActionResult` so the page never has to
 * try/catch. On success, paths in the onboarding tree are revalidated so the
 * next render reflects the new draft / summary / status.
 */

import {revalidatePath} from 'next/cache';
import {
  api,
  ApiError,
  type TenantContextDraft,
  type TenantContextContract,
  type TenantContextMode,
  type TenantContextManualFormBody,
  type TenantProfileSummary,
} from '@/lib/api';

export type ActionResult<T> =
  | {kind: 'ok'; data: T}
  | {kind: 'forbidden'; message: string}
  | {kind: 'invalid'; message: string; details?: unknown}
  | {kind: 'error'; message: string; status: number};

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

const BASE = '/workspace/onboarding/profile';

function revalidateOnboarding() {
  revalidatePath(BASE);
  revalidatePath(`${BASE}/mode`);
  revalidatePath(`${BASE}/validation`);
  revalidatePath('/workspace/overview');
}

export async function startProfile(mode: TenantContextMode): Promise<ActionResult<TenantContextDraft>> {
  try {
    const data = await api.tenantContext.start({mode});
    revalidateOnboarding();
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function saveAnswer(input: {
  questionKey: string;
  answer: unknown;
  mode?: TenantContextMode;
}): Promise<ActionResult<TenantContextDraft>> {
  if (!input.questionKey?.trim()) return {kind: 'invalid', message: 'questionKey is required.'};
  try {
    const data = await api.tenantContext.saveAnswer(input);
    revalidateOnboarding();
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function submitManualForm(body: TenantContextManualFormBody): Promise<ActionResult<TenantContextDraft>> {
  try {
    const data = await api.tenantContext.submitManualForm(body);
    revalidateOnboarding();
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function generateSummary(): Promise<ActionResult<TenantProfileSummary>> {
  try {
    const data = await api.tenantContext.generateSummary();
    revalidateOnboarding();
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function approveProfile(): Promise<ActionResult<TenantContextContract>> {
  try {
    const data = await api.tenantContext.approve();
    revalidateOnboarding();
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function rejectProfile(reason?: string): Promise<ActionResult<TenantContextDraft>> {
  try {
    const data = await api.tenantContext.reject({reason});
    revalidateOnboarding();
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function editAnswers(answers: Record<string, unknown>): Promise<ActionResult<TenantContextDraft>> {
  try {
    const data = await api.tenantContext.editAnswers({answers});
    revalidateOnboarding();
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}
