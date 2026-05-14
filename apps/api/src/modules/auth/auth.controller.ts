import { Body, Controller, HttpCode, HttpStatus, Ip, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AllowTenantless, Public } from '../../common/authorization';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  buildLogoutCookieOptions,
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from './session.constants';

class SelectWorkspaceDto {
  @IsString()
  tenantId!: string;
}

/**
 * Auth surface — strictly cookie-based.
 *
 *   POST /auth/login    — sets the synapse_session HttpOnly cookie
 *   POST /auth/register — sets the synapse_session HttpOnly cookie
 *   POST /auth/logout   — clears the cookie; idempotent
 *
 * Response bodies never include the access token. JS on the page can't
 * read it (HttpOnly), and it's only sent on requests to the API origin
 * (SameSite=Lax + browser auto-attach).
 */
@Controller('auth')
@Throttle({ auth: { limit: 5, ttl: 60_000 } })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.register(dto, ip);
    this.setSessionCookie(res, session.token);
    return { user: session.user };
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.login(dto, ip);
    this.setSessionCookie(res, session.token);
    return { user: session.user };
  }

  @AllowTenantless()
  @Post('workspace')
  async selectWorkspace(
    @Body() dto: SelectWorkspaceDto,
    @Req() req: Request & { user: AuthenticatedUser },
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.selectWorkspace({
      userId: req.user.sub,
      email: req.user.email,
      tenantId: dto.tenantId,
      ip,
    });
    this.setSessionCookie(res, session.token);
    return { user: session.user };
  }

  /**
   * Idempotent: returns 204 whether the caller has a valid session or
   * not. Clearing the cookie is the only state change.
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie(SESSION_COOKIE_NAME, this.logoutCookieOptions());

    // Best-effort audit. The route is @Public(), so req.user may be
    // missing — pass it along when present.
    const {user} = req as Request & {user?: AuthenticatedUser};
    await this.authService.recordLogout(
      user ? { sub: user.sub, tenantId: user.tenantId } : null,
      ip,
    );
  }

  // ─── helpers ─────────────────────────────────────────────────────

  private setSessionCookie(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE_NAME, token, buildSessionCookieOptions({
      isProduction:   this.config.get<string>('NODE_ENV') === 'production',
      maxAgeSeconds:  this.parseExpiresInSeconds(
        this.config.get<string>('JWT_EXPIRES_IN', '1d'),
      ),
    }));
  }

  private logoutCookieOptions() {
    return buildLogoutCookieOptions({
      isProduction: this.config.get<string>('NODE_ENV') === 'production',
    });
  }

  /**
   * Parse `JWT_EXPIRES_IN` into seconds. Accepts the same shorthand
   * `jsonwebtoken` does — `15m`, `1h`, `1d`, `7d`, or a plain number
   * meaning seconds. Falls back to 24h on parse failure to avoid
   * minting a non-expiring cookie.
   */
  private parseExpiresInSeconds(value: string): number {
    const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
    if (!match) return 60 * 60 * 24; // 1d fallback
    const n = Number(match[1]);
    switch (match[2]) {
      case 's': return n;
      case 'm': return n * 60;
      case 'h': return n * 60 * 60;
      case 'd': return n * 60 * 60 * 24;
      default:  return n; // bare number = seconds
    }
  }
}
