import { SetMetadata } from '@nestjs/common';

export const ALLOW_TENANTLESS_KEY = Symbol('synapse:allowTenantless');

export const AllowTenantless = () => SetMetadata(ALLOW_TENANTLESS_KEY, true);
