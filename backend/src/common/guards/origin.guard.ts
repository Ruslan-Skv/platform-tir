import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Защита от CSRF: проверяет, что запрос пришёл с разрешённого origin.
 * Используется для публичных state-changing эндпоинтов (регистрация, формы).
 * Origin/Referer устанавливаются браузером и не могут быть подделаны
 * в cross-origin запросах из JavaScript.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowedOrigins: Set<string>;
  private readonly allowMissingOrigin: boolean;

  constructor(private configService: ConfigService) {
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000';
    this.allowedOrigins = new Set(corsOrigin.split(',').map((o) => o.trim().replace(/\/$/, '')));
    this.allowMissingOrigin = configService.get<string>('ORIGIN_GUARD_ALLOW_MISSING') === 'true';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;
    const referer = request.headers.referer;

    // Без Origin/Referer mutation-запросы отклоняем всегда (fail-closed).
    // Обход для не-браузерных клиентов (curl, e2e-тесты) — явная переменная ORIGIN_GUARD_ALLOW_MISSING.
    if (!origin && !referer) {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase());
      if (isMutation && this.allowMissingOrigin !== true) {
        throw new ForbiddenException('Invalid request origin');
      }
      return true;
    }

    if (origin && this.allowedOrigins.has(origin)) {
      return true;
    }

    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (this.allowedOrigins.has(refererOrigin)) {
          return true;
        }
      } catch {
        // Invalid Referer URL
      }
    }

    throw new ForbiddenException('Invalid request origin');
  }
}
