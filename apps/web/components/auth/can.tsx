'use client';

import {createContext, useContext, type ReactNode} from 'react';
import type {CurrentUser} from '@/lib/api';
import {hasAnyPermission, hasPermission, type Permission} from '@/lib/permissions';

// ─────────────────────────────────────────────────────────────────────
// Context — populated once at the dashboard root from /users/me
// ─────────────────────────────────────────────────────────────────────

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: ReactNode;
}) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

/** Read the current authenticated user from context. */
export function useCurrentUser(): CurrentUser | null {
  return useContext(CurrentUserContext);
}

/** Returns `true` iff the user has *all* permissions in `required`. */
export function useCan(required: Permission | ReadonlyArray<Permission>): boolean {
  const user = useCurrentUser();
  return hasPermission(user, required);
}

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

interface CanProps {
  /** Single permission — user must have it. */
  permission?: Permission;
  /** All-of: user must have every listed permission. */
  all?: ReadonlyArray<Permission>;
  /** Any-of: user must have at least one of the listed permissions. */
  any?: ReadonlyArray<Permission>;
  /** Optional fallback rendered when the gate is closed (e.g. a placeholder, an upsell). */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Render `children` only when the current user satisfies the permission gate.
 *
 * @example
 *   <Can permission="agents:write">
 *     <button>New agent</button>
 *   </Can>
 *
 *   <Can any={['pulse:validate', 'pulse:reject']} fallback={<ReadOnlyNotice />}>
 *     <ValidationToolbar />
 *   </Can>
 */
export function Can({permission, all, any, fallback = null, children}: CanProps) {
  const user = useCurrentUser();

  let allowed = true;
  if (permission) allowed = allowed && hasPermission(user, permission);
  if (all)        allowed = allowed && hasPermission(user, all);
  if (any)        allowed = allowed && hasAnyPermission(user, any);

  return <>{allowed ? children : fallback}</>;
}

/** Inverse of `<Can>` — render `children` only when the user *lacks* the permission. */
export function Cannot({permission, all, any, children}: Omit<CanProps, 'fallback'>) {
  const user = useCurrentUser();

  let allowed = true;
  if (permission) allowed = allowed && hasPermission(user, permission);
  if (all)        allowed = allowed && hasPermission(user, all);
  if (any)        allowed = allowed && hasAnyPermission(user, any);

  return <>{allowed ? null : children}</>;
}
