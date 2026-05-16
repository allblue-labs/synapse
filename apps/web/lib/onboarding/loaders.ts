import {api, ApiError, type TenantContextStatus} from '@/lib/api';

/**
 * Onboarding loaders — the only place that talks to `api.tenantContext.*`
 * on the read path. Pages stay simple consumers (`const r = await loadStatus()`).
 */

export type LoadResult<T> =
  | {kind: 'ok'; data: T}
  | {kind: 'forbidden'}
  | {kind: 'not_found'}
  | {kind: 'error'; status: number; message: string};

export async function loadStatus(): Promise<LoadResult<TenantContextStatus>> {
  try {
    const data = await api.tenantContext.status();
    return {kind: 'ok', data};
  } catch (err) {
    return mapError(err);
  }
}

function mapError<T>(err: unknown): LoadResult<T> {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return {kind: 'forbidden'};
    if (err.status === 404) return {kind: 'not_found'};
    return {kind: 'error', status: err.status, message: err.message};
  }
  return {
    kind: 'error',
    status: 0,
    message: err instanceof Error ? err.message : 'Unknown error.',
  };
}
