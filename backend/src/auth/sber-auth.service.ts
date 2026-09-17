import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { Agent, fetch as undiciFetch } from 'undici';
import { AuthService } from './auth.service';
import { hashPassword } from './password-crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../database/prisma.service';

// Продовые эндпоинты Сбер ID (контур Cloud, актуальные на 2026; см. developers.sber.ru/docs/ru/sberid).
// Запросы токена и профиля выполняются с клиентским сертификатом (mTLS), полученным при регистрации.
// Эндпоинты переопределяются через env (например, для тестового контура IFT).
const SBER_AUTH_URL_DEFAULT = 'https://id.sber.ru/CSAFront/oidc/authorize.do';
const SBER_TOKEN_URL_DEFAULT = 'https://oauth.sber.ru/ru/prod/tokens/v2/oidc';
const SBER_USER_INFO_URL_DEFAULT = 'https://oauth.sber.ru/ru/prod/sberbankid/v2.1/userinfo';

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
  private dispatcher: Agent | undefined; // кэш mTLS-диспетчера (undefined — ещё не создан)

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
    if (!this.hasClientCertificate()) {
      throw new BadRequestException(
        'Сбер ID не настроен: не задан клиентский сертификат для mTLS (SBER_CLIENT_CERT_FILE/KEY_FILE или SBER_CLIENT_PFX_FILE)',
      );
    }
    const siteUrl = this.config.get<string>('SITE_URL', 'http://localhost:3000');
    const redirectUri = `${siteUrl.replace(/\/$/, '')}/auth/sber/callback`;
    const scope = 'openid name phone email';

    // state защищает от login CSRF: навязывание жертве чужого кода авторизации
    const state = crypto.randomBytes(16).toString('hex');
    // nonce — параметр схемы авторизации Сбера (OIDC)
    const nonce = crypto.randomBytes(16).toString('hex');
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(SBER_OAUTH_STATE_COOKIE, state, buildSberStateCookieOptions(isProd));

    const params = new URLSearchParams({
      response_type: 'code',
      client_type: 'PRIVATE',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      nonce,
      app: 'false',
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

  /** Конфигурация клиентского сертификата: PEM-файлы, PEM из env или PFX-контейнер. */
  private hasClientCertificate(): boolean {
    return this.readCertificateConfig() !== null;
  }

  private readCertificateConfig(): {
    cert?: string;
    key?: string;
    pfx?: Buffer;
    passphrase?: string;
  } | null {
    const certFile = this.config.get<string>('SBER_CLIENT_CERT_FILE');
    const keyFile = this.config.get<string>('SBER_CLIENT_KEY_FILE');
    const pfxFile = this.config.get<string>('SBER_CLIENT_PFX_FILE');
    const certEnv = this.config.get<string>('SBER_CLIENT_CERT');
    const keyEnv = this.config.get<string>('SBER_CLIENT_KEY');

    if (certFile && keyFile) {
      try {
        return { cert: fs.readFileSync(certFile, 'utf8'), key: fs.readFileSync(keyFile, 'utf8') };
      } catch (e) {
        throw new BadRequestException(
          `Сбер ID: не удалось прочитать файлы сертификата mTLS (${(e as Error).message})`,
        );
      }
    }
    if (certEnv && keyEnv) {
      return { cert: certEnv, key: keyEnv };
    }
    if (pfxFile) {
      try {
        return {
          pfx: fs.readFileSync(pfxFile),
          passphrase: this.config.get<string>('SBER_CLIENT_PFX_PASSPHRASE') || undefined,
        };
      } catch (e) {
        throw new BadRequestException(
          `Сбер ID: не удалось прочитать PFX-контейнер сертификата (${(e as Error).message})`,
        );
      }
    }
    return null;
  }

  /**
   * CA для проверки серверных сертификатов Сбера (цепочка НУЦ Минцифры).
   * Важно: при передаче любых connect-опций (наш pfx) undici перестаёт использовать
   * дефолтное хранилище CA Node (NODE_EXTRA_CA_CERTS/NODE_USE_SYSTEM_CA не применяются),
   * поэтому корни нужно передавать в Agent явно. Берём их из NODE_EXTRA_CA_CERTS.
   */
  private getExtraCa(): string[] {
    const extra = this.config.get<string>('NODE_EXTRA_CA_CERTS') || '';
    const sep = process.platform === 'win32' ? ';' : ':';
    return extra
      .split(sep)
      .map((p) => p.trim())
      .filter(Boolean)
      .flatMap((p) => {
        try {
          return [fs.readFileSync(p, 'utf8')];
        } catch {
          return [];
        }
      });
  }

  /** mTLS-диспетчер для запросов к Сберу (токен и профиль). Кэшируется после первого создания. */
  private getMtlsDispatcher(): Agent {
    if (this.dispatcher === undefined) {
      const cfg = this.readCertificateConfig();
      if (!cfg) {
        throw new BadRequestException(
          'Сбер ID не настроен: запросы токена выполняются с клиентским сертификатом (mTLS), задайте SBER_CLIENT_CERT_FILE/KEY_FILE или SBER_CLIENT_PFX_FILE',
        );
      }
      const ca = this.getExtraCa();
      this.dispatcher = new Agent({ connect: { ...cfg, ...(ca.length ? { ca } : {}) } });
    }
    return this.dispatcher;
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
    // rquid — идентификатор цепочки запросов (32 hex); один на вход, в заголовках токена и профиля
    const rquid = crypto.randomUUID().replace(/-/g, '');
    const dispatcher = this.getMtlsDispatcher();

    const tokenRes = await undiciFetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        rquid,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
      dispatcher,
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      console.error('Sber ID token error:', err);
      throw new BadRequestException('Не удалось войти через Сбер ID. Попробуйте ещё раз.');
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    const infoRes = await undiciFetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'x-introspect-rquid': rquid,
      },
      dispatcher,
    });

    if (!infoRes.ok) {
      const err = await infoRes.json().catch(() => ({}));
      console.error('Sber ID userinfo error:', err);
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
