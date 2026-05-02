import { UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
};
