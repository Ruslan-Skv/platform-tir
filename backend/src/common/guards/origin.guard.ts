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

  constructor(private configService: ConfigService) {
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000';
    this.allowedOrigins = new Set(corsOrigin.split(',').map((o) => o.trim().replace(/\/$/, '')));
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;
    const referer = request.headers.referer;

    // Без Origin/Referer state-changing запросы отклоняем (кроме dev)
    if (!origin && !referer) {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase());
      if (isMutation && process.env.NODE_ENV === 'production') {
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
