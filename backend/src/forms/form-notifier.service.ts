import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../database/prisma.service';

export type FormType = 'measurement' | 'callback' | 'director' | 'quote';

export interface FormNotificationPayload {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

@Injectable()
export class FormNotifierService {
  private readonly telegramBotToken: string | undefined;
  private readonly mailFrom: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {
    this.telegramBotToken = this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
    this.mailFrom = this.config.get<string>('MAIL_FROM') || 'noreply@example.com';
  }

  /**
   * Отправляет уведомление о заявке во все настроенные каналы (email, Telegram и др.)
   */
  async notify(formType: FormType, payload: FormNotificationPayload): Promise<void> {
    const channels = await this.getChannelsForForm(formType);
    const results = await Promise.allSettled([
      ...(channels.email ? [this.sendEmail(channels.email, formType, payload)] : []),
      ...(channels.telegramChatId && this.telegramBotToken
        ? [this.sendTelegram(channels.telegramChatId, payload)]
        : []),
    ]);

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'rejected') {
        console.error(`FormNotifierService.notify(${formType}) channel ${i} error:`, r.reason);
      }
    }
  }

  private async getChannelsForForm(
    formType: FormType,
  ): Promise<{ email?: string; telegramChatId?: string }> {
    switch (formType) {
      case 'measurement': {
        const block = await this.prisma.measurementFormBlock.findUnique({
          where: { id: 'main' },
        });
        return {
          email: block?.recipientEmail?.trim() || undefined,
          telegramChatId: block?.telegramChatId?.trim() || undefined,
        };
      }
      case 'callback': {
        const block = await this.prisma.callbackFormBlock.findUnique({
          where: { id: 'main' },
        });
        return {
          email: block?.recipientEmail?.trim() || undefined,
          telegramChatId: block?.telegramChatId?.trim() || undefined,
        };
      }
      case 'director': {
        const block = await this.prisma.directorMessageBlock.findUnique({
          where: { id: 'main' },
        });
        return {
          email: block?.directorEmail?.trim() || undefined,
          telegramChatId: block?.telegramChatId?.trim() || undefined,
        };
      }
      case 'quote': {
        const block = await this.prisma.quoteFormBlock.findUnique({
          where: { id: 'main' },
        });
        return {
          email: block?.recipientEmail?.trim() || undefined,
          telegramChatId: block?.telegramChatId?.trim() || undefined,
        };
      }
    }
  }

  private async sendEmail(
    to: string,
    formType: FormType,
    payload: FormNotificationPayload,
  ): Promise<void> {
    const fromLabels: Record<FormType, string> = {
      measurement: 'Заявка на замер',
      callback: 'Обратный звонок',
      director: 'Письмо директору',
      quote: 'Рассчитать стоимость',
    };
    await this.mailer.sendMail({
      from: `"Сайт: ${fromLabels[formType]}" <${this.mailFrom}>`,
      to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
  }

  private async sendTelegram(chatId: string, payload: FormNotificationPayload): Promise<void> {
    if (!this.telegramBotToken) return;
    const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: payload.text,
        parse_mode: undefined,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${err}`);
    }
    const data = (await response.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      throw new Error(`Telegram API: ${data.description || 'unknown error'}`);
    }
  }
}
