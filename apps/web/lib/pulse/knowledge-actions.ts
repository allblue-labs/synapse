'use server';

/**
 * Knowledge management — Server Actions.
 *
 *   - Same `ActionResult<T>` envelope used by ticket lifecycle actions.
 *   - Revalidate the knowledge index on success so the RSC re-renders
 *     with fresh state.
 *   - Backend remains the only authority on permissions; UI is gated
 *     via `<Can permission="pulse:write">` for usability.
 */

import {revalidatePath} from 'next/cache';
import {api, ApiError, type PulseKnowledgeContextRecord, type PulseKnowledgeContextType} from '@/lib/api';
import type {ActionResult} from './actions';

const KNOWLEDGE_PATH = '/workspace/modules/pulse/knowledge';

function strFromInput(input: FormData | object | undefined, key: string): string | undefined {
  if (!input) return undefined;
  if (input instanceof FormData) {
    const v = input.get(key);
    return typeof v === 'string' && v.length > 0 ? v : undefined;
  }
  const v = (input as Record<string, unknown>)[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

const KNOWLEDGE_TYPES: ReadonlyArray<PulseKnowledgeContextType> = [
  'FAQ',
  'BUSINESS_DESCRIPTION',
  'OPERATIONAL_INSTRUCTION',
  'PRODUCT_SERVICE',
  'CAMPAIGN_PROMOTION',
];

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

export async function publishKnowledge(
  input: {type: PulseKnowledgeContextType; title: string; content: string} | FormData,
): Promise<ActionResult<PulseKnowledgeContextRecord>> {
  const type = strFromInput(input, 'type');
  const title = strFromInput(input, 'title');
  const content = strFromInput(input, 'content');

  if (!type)    return {kind: 'invalid', message: 'type is required.'};
  if (!title)   return {kind: 'invalid', message: 'title is required.'};
  if (!content) return {kind: 'invalid', message: 'content is required.'};
  if (!(KNOWLEDGE_TYPES as ReadonlyArray<string>).includes(type)) {
    return {kind: 'invalid', message: `type must be one of: ${KNOWLEDGE_TYPES.join(', ')}.`};
  }

  try {
    const data = await api.pulse.publishKnowledge({
      type: type as PulseKnowledgeContextType,
      title,
      content,
    });
    revalidatePath(KNOWLEDGE_PATH);
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

export async function archiveKnowledge(
  input: {id: string} | FormData,
): Promise<ActionResult<PulseKnowledgeContextRecord>> {
  const id = strFromInput(input, 'id');
  if (!id) return {kind: 'invalid', message: 'id is required.'};

  try {
    const data = await api.pulse.archiveKnowledge(id);
    revalidatePath(KNOWLEDGE_PATH);
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}
