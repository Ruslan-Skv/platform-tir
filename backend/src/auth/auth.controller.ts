import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest, Response } from 'express';
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
import { RefreshCookieService } from './refresh-cookie.service';
import type { RequestWithUser } from '../common/types/request-with-user.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly yandexAuthService: YandexAuthService,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(OriginGuard, LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Вход в систему (refresh в httpOnly cookie)' })
  async login(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
  ) {
    void loginDto; // ValidationPipe; аутентификация по email/паролю — в LocalAuthGuard
    const data = await this.authService.login(req.user);
    this.refreshCookie.attach(res, data.refresh_token);
    return { access_token: data.access_token, user: data.user };
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseGuards(OriginGuard)
  @Post('register')
  @ApiOperation({ summary: 'Регистрация (refresh в httpOnly cookie)' })
  async register(@Res({ passthrough: true }) res: Response, @Body() registerDto: RegisterDto) {
    const data = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.firstName,
      registerDto.lastName,
    );
    this.refreshCookie.attach(res, data.refresh_token);
    return { access_token: data.access_token, user: data.user };
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseGuards(OriginGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Обновить access по refresh из httpOnly cookie' })
  async refresh(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const raw = this.refreshCookie.read(req);
    if (!raw) {
      this.refreshCookie.clear(res);
      throw new UnauthorizedException('Нет сессии. Войдите снова.');
    }
    try {
      const data = await this.authService.refreshTokens(raw);
      this.refreshCookie.attach(res, data.refresh_token);
      return { access_token: data.access_token, user: data.user };
    } catch (e) {
      // Не сбрасываем cookie: параллельный refresh в другой вкладке мог уже выдать новый rt,
      // а ответ с clearCookie затрёт валидную сессию.
      throw e;
    }
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(OriginGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Выход: отозвать refresh и очистить cookie' })
  async logout(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const raw = this.refreshCookie.read(req);
    if (raw) {
      await this.authService.revokeRefreshToken(raw);
    }
    this.refreshCookie.clear(res);
    return { ok: true };
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
  @ApiOperation({ summary: 'Обмен кода Яндекс на JWT (refresh в cookie)' })
  async yandexCallback(@Res({ passthrough: true }) res: Response, @Body() dto: YandexCallbackDto) {
    const data = await this.yandexAuthService.exchangeCodeForUser(dto.code);
    this.refreshCookie.attach(res, data.refresh_token);
    return { access_token: data.access_token, user: data.user };
  }
}
