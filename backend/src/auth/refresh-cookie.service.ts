import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { parseDurationToMs } from './auth-duration.util';

/**
 * httpOnly refresh cookie: только для маршрутов /{API_PREFIX}/auth/* (минимизация утечки с запросами к другим API).
 */
@Injectable()
export class RefreshCookieService {
  constructor(private readonly config: ConfigService) {}

  get name(): string {
    return this.config.get<string>('REFRESH_COOKIE_NAME') || 'rt';
  }

  getRefreshMaxAgeMs(): number {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';
    return parseDurationToMs(raw, 30 * 86_400_000);
  }

  /** Path вида /api/v1/auth */
  getPath(): string {
    const prefix = (this.config.get<string>('API_PREFIX') || 'api/v1').replace(/^\/+|\/+$/g, '');
    return `/${prefix}/auth`;
  }

  getDomain(): string | undefined {
    const d = this.config.get<string>('REFRESH_COOKIE_DOMAIN');
    return d?.trim() ? d.trim() : undefined;
  }

  private isSecure(): boolean {
    const explicit = this.config.get<string>('REFRESH_COOKIE_SECURE');
    if (explicit === 'false' || explicit === '0') return false;
    if (explicit === 'true' || explicit === '1') return true;
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private baseOptions(maxAgeMs: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isSecure(),
      sameSite: 'lax',
      path: this.getPath(),
      maxAge: maxAgeMs,
      domain: this.getDomain(),
    };
  }

  attach(res: Response, rawRefreshToken: string): void {
    res.cookie(this.name, rawRefreshToken, this.baseOptions(this.getRefreshMaxAgeMs()));
  }

  clear(res: Response): void {
    res.clearCookie(this.name, {
      httpOnly: true,
      secure: this.isSecure(),
      sameSite: 'lax',
      path: this.getPath(),
      domain: this.getDomain(),
    });
  }

  read(req: Request): string | undefined {
    const v = req.cookies?.[this.name];
    return typeof v === 'string' && v.length >= 32 ? v : undefined;
  }
}
