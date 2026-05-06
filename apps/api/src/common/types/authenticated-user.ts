import type { UserRole } from '@synapse/contracts';

/**
 * Shape of the JWT payload as it lands on the request after passport-jwt
 * verification. Use this type wherever guards / controllers consume `req.user`.
 *
 * The `role` is the canonical UserRole defined in `@synapse/contracts` —
 * stored in the membership table via Prisma's matching enum.
 */
export type AuthenticatedUser = {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
};
