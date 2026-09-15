import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { hashPassword } from './password-crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../database/prisma.service';

const YANDEX_AUTH_URL = 'https://oauth.yandex.com/authorize';
const YANDEX_TOKEN_URL = 'https://oauth.yandex.com/token';
const YANDEX_USER_INFO_URL = 'https://login.yandex.ru/info';

export const YANDEX_OAUTH_STATE_COOKIE = 'yandex_oauth_state';

export function buildYandexStateCookieOptions(isProd: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/api/v1/auth',
    maxAge: 10 * 60 * 1000,
  };
}

interface YandexUserInfo {
  id: string;
  login: string;
  default_email?: string;
  emails?: string[];
  first_name?: string;
  last_name?: string;
  default_avatar_id?: string;
  is_avatar_empty?: boolean;
}

@Injectable()
export class YandexAuthService {
  constructor(
    private config: ConfigService,
    private authService: AuthService,
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  getAuthorizationUrl(res: Response): { url: string } {
    const clientId = this.config.get<string>('YANDEX_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Yandex OAuth не настроен (YANDEX_CLIENT_ID)');
    }
    const siteUrl = this.config.get<string>('SITE_URL', 'http://localhost:3000');
    const redirectUri = `${siteUrl.replace(/\/$/, '')}/auth/yandex/callback`;
    const scope = 'login:info login:email login:avatar';

    // state защищает от login CSRF: навязывание жертве чужого кода авторизации
    const state = crypto.randomBytes(16).toString('hex');
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(YANDEX_OAUTH_STATE_COOKIE, state, buildYandexStateCookieOptions(isProd));

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    });
    return { url: `${YANDEX_AUTH_URL}?${params.toString()}` };
  }

  /** Сверяет state из callback со state-cookie, выставленным при редиректе на Яндекс. */
  private assertStateCookie(req: Request, state: string | undefined): void {
    const expected = req.cookies?.[YANDEX_OAUTH_STATE_COOKIE];
    const sameLength = !!state && !!expected && state.length === expected.length;
    if (!sameLength || !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expected))) {
      throw new BadRequestException('Недействительный параметр state. Начните вход заново.');
    }
  }

  async exchangeCodeForUser(code: string, req: Request, res: Response) {
    this.assertStateCookie(req, (req.body as { state?: string } | undefined)?.state);
    res.clearCookie(YANDEX_OAUTH_STATE_COOKIE, { path: '/api/v1/auth' });

    const clientId = this.config.get<string>('YANDEX_CLIENT_ID');
    const clientSecret = this.config.get<string>('YANDEX_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Yandex OAuth не настроен');
    }

    const siteUrl = this.config.get<string>('SITE_URL', 'http://localhost:3000');
    const redirectUri = `${siteUrl.replace(/\/$/, '')}/auth/yandex/callback`;

    const tokenRes = await fetch(YANDEX_TOKEN_URL, {
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
      console.error('Yandex token error:', err);
      throw new BadRequestException('Не удалось войти через Яндекс. Попробуйте ещё раз.');
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    const infoRes = await fetch(`${YANDEX_USER_INFO_URL}?format=json`, {
      headers: { Authorization: `OAuth ${accessToken}` },
    });

    if (!infoRes.ok) {
      throw new BadRequestException('Не удалось получить данные пользователя Яндекс.');
    }

    const yandexUser = (await infoRes.json()) as YandexUserInfo;
    const email =
      yandexUser.default_email ||
      (Array.isArray(yandexUser.emails) && yandexUser.emails[0]) ||
      null;

    if (!email) {
      throw new BadRequestException(
        'Не удалось получить email из аккаунта Яндекс. Убедитесь, что приложение запрашивает доступ к email.',
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const yandexId = yandexUser.id;

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
        OR: [{ yandexId }, { email: { equals: normalizedEmail, mode: 'insensitive' } }],
      },
    });

    if (existing) {
      if (existing.isGuest) {
        const randomPassword = `yandex_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
        const hashedPassword = await hashPassword(randomPassword);
        const updated = await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            password: hashedPassword,
            isGuest: false,
            yandexId,
            firstName: yandexUser.first_name || existing.firstName,
            lastName: yandexUser.last_name || existing.lastName,
            avatar: this.getYandexAvatarUrl(yandexUser) || existing.avatar,
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
      } else if (!existing.yandexId) {
        const updated = await this.prisma.user.update({
          where: { id: existing.id },
          data: { yandexId },
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
      const randomPassword = `yandex_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
      const created = await this.usersService.create({
        email: normalizedEmail,
        password: randomPassword,
        firstName: yandexUser.first_name || undefined,
        lastName: yandexUser.last_name || undefined,
      });
      const avatarUrl = this.getYandexAvatarUrl(yandexUser);
      await this.prisma.user.update({
        where: { id: created.id },
        data: { yandexId, avatar: avatarUrl },
      });
      loginUser = {
        id: created.id,
        email: created.email,
        firstName: created.firstName ?? null,
        lastName: created.lastName ?? null,
        role: created.role,
        avatar: avatarUrl,
      };
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

  private getYandexAvatarUrl(yandexUser: YandexUserInfo): string | null {
    if (yandexUser.is_avatar_empty || !yandexUser.default_avatar_id) return null;
    return `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`;
  }
}
