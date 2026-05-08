import type { AuthRole } from '@synapse/contracts';

/**
 * Shape of the JWT payload as it lands on the request after passport-jwt
 * verification. Use this type wherever guards / controllers consume `req.user`.
 *
 * Tenant users carry a tenantId. Platform admins are tenantless and carry
 * `role: platform_admin`; tenant-scoped routes may still require an explicit
 * x-tenant-id when platform admins intentionally act across tenants.
 */
export type AuthenticatedUser = {
  sub: string;
  tenantId?: string;
  role: AuthRole;
  email: string;
};
