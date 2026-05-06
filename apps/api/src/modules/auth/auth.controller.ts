import { Body, Controller, Ip, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/authorization';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
@Throttle({ auth: { limit: 5, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Ip() ip: string) {
    return this.authService.register(dto, ip);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    // `@Ip()` resolves to req.ip — Express derives this from
    // X-Forwarded-For when `app.set('trust proxy', 1)` is enabled
    // (configured in main.ts).
    return this.authService.login(dto, ip);
  }
}
