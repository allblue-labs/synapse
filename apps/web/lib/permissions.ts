/**
 * Frontend permission helpers — thin wrapper around the canonical map in
 * `@synapse/contracts`. The backend is the only authority on permissions
 * (the `/users/me` response carries the resolved set), so these helpers exist
 * solely to gate UI for usability — never as a security boundary.
 */

import {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  permissionsForRole,
  roleHasAllPermissions,
  roleHasPermission,
  type Permission,
  type UserRole,
} from '@synapse/contracts';
import type {CurrentUser} from '@/lib/api';

export type {Permission, UserRole};
export {ALL_PERMISSIONS, ROLE_PERMISSIONS, permissionsForRole};

/**
 * True iff the user has *every* permission in `required`.
 * Uses the user's resolved permission list (sent by the API) when available;
 * falls back to deriving from the role for resilience.
 */
export function hasPermission(
  user: CurrentUser | null | undefined,
  required: Permission | ReadonlyArray<Permission>,
): boolean {
  if (!user) return false;
  const list = Array.isArray(required) ? required : [required as Permission];
  if (list.length === 0) return true;

  if (user.permissions && user.permissions.length > 0) {
    return list.every((p) => user.permissions.includes(p));
  }
  return roleHasAllPermissions(user.role, list);
}

/** True iff the user has *at least one* of the listed permissions. */
export function hasAnyPermission(
  user: CurrentUser | null | undefined,
  required: ReadonlyArray<Permission>,
): boolean {
  if (!user) return false;
  if (required.length === 0) return true;

  if (user.permissions && user.permissions.length > 0) {
    return required.some((p) => user.permissions.includes(p));
  }
  return required.some((p) => roleHasPermission(user.role, p));
}
