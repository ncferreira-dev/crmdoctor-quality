import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Anti brute-force: 5 tentativas por minuto por IP. Um usuário real que
  // errou a senha tem folga; um bot tentando senhas em massa é barrado.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
