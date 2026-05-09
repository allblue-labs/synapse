'use client';

import {useEffect, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {useCurrentUser} from './can';

/**
 * TenantInvalidator — listens for `currentUser.tenantId` changes and
 * clears any tenant-scoped client-side cache by hard-reloading the
 * router cache.
 *
 * Why this exists:
 *   - Pulse data is strictly tenant-scoped on the backend.
 *   - Next App Router caches RSC results per route; if the same browser
 *     tab switches tenants (today only via re-login), stale ticket /
 *     conversation / channel data must not flash on the new tenant.
 *   - We don't yet have a tenant-switcher UI, but the hook is wired
 *     now so the moment one ships, no Pulse data leaks across tenants.
 *
 * Behaviour:
 *   - On the *first* render after mount we just record the current
 *     tenantId. We never invalidate on initial paint — that would loop.
 *   - On any subsequent change of `tenantId`, call `router.refresh()`
 *     to drop the client cache for the current route and re-fetch.
 *
 * Pure side-effect; no DOM output.
 */
export function TenantInvalidator() {
  const user = useCurrentUser();
  const router = useRouter();
  const lastTenantId = useRef<string | null>(null);

  useEffect(() => {
    const next = user?.tenant?.id ?? null;

    // First mount — establish the baseline without invalidating.
    if (lastTenantId.current === null) {
      lastTenantId.current = next;
      return;
    }

    if (next !== lastTenantId.current) {
      lastTenantId.current = next;
      router.refresh();
    }
  }, [user?.tenant?.id, router]);

  return null;
}
