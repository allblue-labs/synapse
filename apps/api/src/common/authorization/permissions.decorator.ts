import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@synapse/contracts';

export const PERMISSIONS_KEY = 'authorization:requiredPermissions';

/**
 * Declare the permission(s) required to invoke a handler. The PermissionsGuard
 * resolves the authenticated user's role-derived permission set and rejects
 * the request with 403 if any required permission is missing.
 *
 * Multiple permissions are AND-ed — pass them all and require all of them.
 *
 * @example
 *   @Permissions('agents:write')
 *   @Post()
 *   create(...) { ... }
 *
 *   @Permissions('clinic-flow:read', 'clinic-flow:validate')
 *   @Post('queue/:id/validate')
 *   validate(...) { ... }
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
