import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { SESSION_COOKIE_NAME } from './session.constants';

/**
 * JWT verification strategy.
 *
 * The token is sourced exclusively from the `synapse_session` HttpOnly
 * cookie — no Authorization header path. JS cannot read the cookie, so
 * the token is invisible to the page and to any third-party script that
 * gets injected via XSS.
 *
 * Tokens are bound to:
 *   - issuer   (`JWT_ISSUER`)
 *   - audience (`JWT_AUDIENCE`)
 * Rotating either of these env vars invalidates every existing session
 * immediately — useful for emergency re-keying.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      issuer:   config.get<string>('JWT_ISSUER',   'synapse-api'),
      audience: config.get<string>('JWT_AUDIENCE', 'synapse-web'),
    });
  }

  validate(payload: AuthenticatedUser): AuthenticatedUser {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    const isPlatformRole = ['super_admin', 'platform_admin', 'admin', 'tester'].includes(payload.role);
    if (!isPlatformRole && !payload.tenantId) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    return payload;
  }
}

/**
 * Reads the JWT from the session cookie. Requires `cookie-parser`
 * middleware to be registered (see `main.ts`).
 */
function cookieExtractor(req: Request): string | null {
  const {cookies} = req as Request & {cookies?: Record<string, string>};
  const value = cookies?.[SESSION_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
