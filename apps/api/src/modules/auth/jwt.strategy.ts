import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

/**
 * JWT verification strategy.
 *
 * Tokens are bound to:
 *   - issuer   (`JWT_ISSUER`)   — only tokens minted by this API are accepted
 *   - audience (`JWT_AUDIENCE`) — only tokens intended for the Synapse web
 *                                  client are accepted; rotating either of
 *                                  these env vars invalidates every existing
 *                                  session immediately.
 *
 * Expiration is enforced (`ignoreExpiration: false`).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      issuer:   config.get<string>('JWT_ISSUER',   'synapse-api'),
      audience: config.get<string>('JWT_AUDIENCE', 'synapse-web'),
    });
  }

  validate(payload: AuthenticatedUser): AuthenticatedUser {
    if (!payload.sub || !payload.tenantId || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    return payload;
  }
}
