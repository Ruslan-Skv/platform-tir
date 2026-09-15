import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { hashPassword } from './password-crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../database/prisma.service';

// Продовые эндпоинты Сбер ID; переопределяются через env (тестовый контур Сбера)
const SBER_AUTH_URL_DEFAULT = 'https://online.sberbank.ru/wa/oa/sberbank_id/authorize';
const SBER_TOKEN_URL_DEFAULT = 'https://online.sberbank.ru/wa/oauth/token';
const SBER_USER_INFO_URL_DEFAULT = 'https://online.sberbank.ru/sa/sberbank_id/profile';

export const SBER_OAUTH_STATE_COOKIE = 'sber_oauth_state';

export function buildSberStateCookieOptions(isProd: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/api/v1/auth',
    maxAge: 10 * 60 * 1000,
  };
}

interface SberUserInfo {
  sub: string;
  email?: string;
  phone?: string;
  given_name?: string;
  family_name?: string;
}

@Injectable()
export class SberAuthService {
  constructor(
    private config: ConfigService,
    private authService: AuthService,
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  getAuthorizationUrl(res: Response): { url: string } {
    const clientId = this.config.get<string>('SBER_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Сбер ID не настроен (SBER_CLIENT_ID)');
    }
    const siteUrl = this.config.get<string>('SITE_URL', 'http://localhost:3000');
    const redirectUri = `${siteUrl.replace(/\/$/, '')}/auth/sber/callback`;
    const scope = 'openid name phone email';

    // state защищает от login CSRF: навязывание жертве чужого кода авторизации
    const state = crypto.randomBytes(16).toString('hex');
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(SBER_OAUTH_STATE_COOKIE, state, buildSberStateCookieOptions(isProd));

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    });
    const authUrl = this.config.get<string>('SBER_AUTH_URL') || SBER_AUTH_URL_DEFAULT;
    return { url: `${authUrl}?${params.toString()}` };
  }

  /** Сверяет state из callback со state-cookie, выставленным при редиректе на Сбер. */
  private assertStateCookie(req: Request, state: string | undefined): void {
    const expected = req.cookies?.[SBER_OAUTH_STATE_COOKIE];
    const sameLength = !!state && !!expected && state.length === expected.length;
    if (!sameLength || !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expected))) {
      throw new BadRequestException('Недействительный параметр state. Начните вход заново.');
    }
  }

  async exchangeCodeForUser(code: string, req: Request, res: Response) {
    this.assertStateCookie(req, (req.body as { state?: string } | undefined)?.state);
    res.clearCookie(SBER_OAUTH_STATE_COOKIE, { path: '/api/v1/auth' });

    const clientId = this.config.get<string>('SBER_CLIENT_ID');
    const clientSecret = this.config.get<string>('SBER_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Сбер ID не настроен');
    }

    const siteUrl = this.config.get<string>('SITE_URL', 'http://localhost:3000');
    const redirectUri = `${siteUrl.replace(/\/$/, '')}/auth/sber/callback`;
    const tokenUrl = this.config.get<string>('SBER_TOKEN_URL') || SBER_TOKEN_URL_DEFAULT;
    const userInfoUrl = this.config.get<string>('SBER_USERINFO_URL') || SBER_USER_INFO_URL_DEFAULT;

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      console.error('Sber ID token error:', err);
      throw new BadRequestException('Не удалось войти через Сбер ID. Попробуйте ещё раз.');
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    const infoRes = await fetch(userInfoUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!infoRes.ok) {
      throw new BadRequestException('Не удалось получить данные пользователя Сбер ID.');
    }

    const sberUser = (await infoRes.json()) as SberUserInfo;
    const sberId = sberUser.sub;
    if (!sberId) {
      throw new BadRequestException(
        'Не удалось получить идентификатор пользователя Сбер ID (убедитесь, что запрошен scope openid).',
      );
    }

    const normalizedEmail = sberUser.email ? sberUser.email.trim().toLowerCase() : null;
    const normalizedPhone = sberUser.phone ? sberUser.phone.replace(/[^\d+]/g, '') : null;

    if (!normalizedEmail && !normalizedPhone) {
      throw new BadRequestException(
        'Не удалось получить email или телефон из аккаунта Сбер ID. Убедитесь, что приложение запрашивает соответствующие scope.',
      );
    }

    // Email обязателен в схеме User; если Сбер его не отдал — генерируем технический адрес
    const email = normalizedEmail || `sber_${sberId}@sberid.local`;

    type LoginUser = {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      role: string;
      avatar: string | null;
    };
    let loginUser: LoginUser;

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { sberId },
          ...(normalizedEmail
            ? [{ email: { equals: normalizedEmail, mode: 'insensitive' as const } }]
            : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.isGuest) {
        const randomPassword = `sber_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
        const hashedPassword = await hashPassword(randomPassword);
        const updated = await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            password: hashedPassword,
            isGuest: false,
            sberId,
            firstName: sberUser.given_name || existing.firstName,
            lastName: sberUser.family_name || existing.lastName,
            ...(normalizedPhone ? { phone: normalizedPhone } : {}),
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatar: true,
          },
        });
        loginUser = { ...updated, avatar: updated.avatar ?? null };
      } else if (!existing.sberId) {
        const updated = await this.prisma.user.update({
          where: { id: existing.id },
          data: { sberId, ...(normalizedPhone ? { phone: normalizedPhone } : {}) },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatar: true,
          },
        });
        loginUser = { ...updated, avatar: updated.avatar ?? null };
      } else {
        loginUser = {
          id: existing.id,
          email: existing.email,
          firstName: existing.firstName,
          lastName: existing.lastName,
          role: existing.role,
          avatar: existing.avatar ?? null,
        };
      }
    } else {
      const randomPassword = `sber_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
      const created = await this.usersService.create({
        email,
        password: randomPassword,
        firstName: sberUser.given_name || undefined,
        lastName: sberUser.family_name || undefined,
      });
      const updated = await this.prisma.user.update({
        where: { id: created.id },
        data: { sberId, ...(normalizedPhone ? { phone: normalizedPhone } : {}) },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
        },
      });
      loginUser = { ...updated, avatar: updated.avatar ?? null };
    }

    return this.authService.login({
      id: loginUser.id,
      email: loginUser.email,
      role: loginUser.role,
      firstName: loginUser.firstName,
      lastName: loginUser.lastName,
      avatar: loginUser.avatar,
    } as Parameters<typeof this.authService.login>[0] & { avatar?: string | null });
  }
}
