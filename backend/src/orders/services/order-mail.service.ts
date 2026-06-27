import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import * as crypto from 'crypto';

export interface OrderEmailContext {
  orderNumber: string;
  customerEmail: string;
  total: number;
  itemsCount: number;
  viewOrderUrl: string;
}

@Injectable()
export class OrderMailService {
  constructor(
    private config: ConfigService,
    private mailer: MailerService,
  ) {}

  private getOrderViewSecret(): string {
    const secret =
      this.config.get<string>('ORDER_VIEW_SECRET') || this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new InternalServerErrorException('ORDER_VIEW_SECRET is not configured');
    }
    return secret;
  }

  /** Генерирует подписанный токен для просмотра заказа по ссылке из письма. */
  generateOrderViewToken(orderId: string, customerEmail: string, expiresInDays = 30): string {
    const secret = this.getOrderViewSecret();
    const payload = `${orderId}:${customerEmail}:${Date.now() + expiresInDays * 24 * 60 * 60 * 1000}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
  }

  /** Проверяет токен и возвращает { orderId, email } или null. */
  verifyOrderViewToken(token: string): { orderId: string; email: string } | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const [orderId, email, expiryStr, signature] = decoded.split(':');
      if (!orderId || !email || !expiryStr || !signature) return null;
      const expiry = parseInt(expiryStr, 10);
      if (Date.now() > expiry) return null;
      const secret = this.getOrderViewSecret();
      const payload = `${orderId}:${email}:${expiryStr}`;
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      if (signature !== expected) return null;
      return { orderId, email };
    } catch {
      return null;
    }
  }

  async sendOrderToCustomer(ctx: OrderEmailContext): Promise<boolean> {
    const from = this.config.get<string>('MAIL_FROM') || 'noreply@example.com';
    try {
      await this.mailer.sendMail({
        from: `"Заказ" <${from}>`,
        to: ctx.customerEmail,
        subject: `Заказ ${ctx.orderNumber} — ознакомьтесь и оплатите`,
        html: this.buildOrderEmailHtml(ctx),
        text: this.buildOrderEmailText(ctx),
      });
      return true;
    } catch (err) {
      console.error('OrderMailService.sendOrderToCustomer error:', err);
      return false;
    }
  }

  private buildOrderEmailHtml(ctx: OrderEmailContext): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Заказ ${ctx.orderNumber}</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1>Ваш заказ ${ctx.orderNumber}</h1>
  <p>Здравствуйте!</p>
  <p>Менеджер подготовил для вас заказ. Количество позиций: ${ctx.itemsCount}. Итого: ${ctx.total.toLocaleString('ru-RU')} ₽.</p>
  <p><a href="${ctx.viewOrderUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Ознакомиться с заказом и оплатить</a></p>
  <p>Ссылка действительна 30 дней.</p>
  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="color: #6b7280; font-size: 12px;">Если кнопка не работает, скопируйте ссылку в браузер: ${ctx.viewOrderUrl}</p>
</body>
</html>`;
  }

  private buildOrderEmailText(ctx: OrderEmailContext): string {
    return `Ваш заказ ${ctx.orderNumber}\n\nМенеджер подготовил для вас заказ. Количество позиций: ${ctx.itemsCount}. Итого: ${ctx.total.toLocaleString('ru-RU')} ₽.\n\nОзнакомиться и оплатить: ${ctx.viewOrderUrl}\n\nСсылка действительна 30 дней.`;
  }
}
