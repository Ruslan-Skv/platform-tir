import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OriginGuard } from '../common/guards/origin.guard';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { YandexCallbackDto } from './dto/yandex-callback.dto';
import { YandexAuthService } from './yandex-auth.service';
import type { RequestWithUser } from '../common/types/request-with-user.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly yandexAuthService: YandexAuthService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(OriginGuard, LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Вход в систему' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async login(@Request() req: RequestWithUser, @Body() _loginDto: LoginDto) {
    return this.authService.login(req.user);
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseGuards(OriginGuard)
  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.firstName,
      registerDto.lastName,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseGuards(OriginGuard)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Запрос восстановления пароля' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(OriginGuard)
  @Post('reset-password')
  @ApiOperation({ summary: 'Сброс пароля по токену из письма' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(OriginGuard)
  @Get('yandex')
  @ApiOperation({ summary: 'URL для авторизации через Яндекс ID' })
  getYandexAuthUrl() {
    return { url: this.yandexAuthService.getAuthorizationUrl() };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(OriginGuard)
  @Post('yandex/callback')
  @ApiOperation({ summary: 'Обмен кода Яндекс на JWT (вызывается с frontend после redirect)' })
  async yandexCallback(@Body() dto: YandexCallbackDto) {
    return this.yandexAuthService.exchangeCodeForUser(dto.code);
  }
}
