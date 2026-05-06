import { SetMetadata } from '@nestjs/common';

/**
 * Symbol-keyed metadata token used by the global JwtAuthGuard and TenantGuard
 * to decide whether to skip authentication for a given handler/controller.
 */
export const IS_PUBLIC_KEY = 'authorization:isPublic';

/**
 * Mark a route (or an entire controller) as public — bypasses both the JWT
 * and the tenant guards. Use sparingly, exclusively for anonymous endpoints
 * such as `/auth/login`, `/auth/register` and the liveness probe.
 *
 * @example
 *   @Public()
 *   @Post('login')
 *   login(@Body() dto: LoginDto) { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
