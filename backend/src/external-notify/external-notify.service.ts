import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

export interface ExternalNotifyPayload {
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  fromLabel?: string;
}

export interface ExternalNotifyChannels {
  emails?: string[];
  telegramIds?: string[];
  maxIds?: string[];
}

@Injectable()
export class ExternalNotifyService {
  private readonly logger = new Logger(ExternalNotifyService.name);
  private readonly telegramBotToken: string | undefined;
  private readonly maxBotToken: string | undefined;
  private readonly maxApiBaseUrl: string;
  private readonly mailFrom: string;

  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {
    this.telegramBotToken = this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
    this.maxBotToken = this.config.get<string>('MAX_BOT_TOKEN')?.trim();
    this.maxApiBaseUrl =
      this.config.get<string>('MAX_API_BASE_URL')?.trim() || 'https://platform-api2.max.ru';
    this.mailFrom = this.config.get<string>('MAIL_FROM') || 'noreply@example.com';
  }

  async send(channels: ExternalNotifyChannels, payload: ExternalNotifyPayload): Promise<void> {
    const emails = (channels.emails ?? []).filter(Boolean);
    const telegramIds = (channels.telegramIds ?? []).filter(Boolean);
    const maxIds = (channels.maxIds ?? []).filter(Boolean);
    const fromLabel = payload.fromLabel ?? 'Сайт';

    const results = await Promise.allSettled([
      ...emails.map((to) =>
        this.mailer.sendMail({
          from: `"${fromLabel}" <${this.mailFrom}>`,
          to,
          replyTo: payload.replyTo,
          subject: payload.subject,
          html: payload.html ?? payload.text.replace(/\n/g, '<br>'),
          text: payload.text,
        }),
      ),
      ...(this.telegramBotToken
        ? telegramIds.map((chatId) => this.sendTelegram(chatId, payload.text))
        : []),
      ...(this.maxBotToken ? maxIds.map((chatId) => this.sendMax(chatId, payload.text)) : []),
    ]);
    for (const result of results) {
      if (result.status === 'rejected') {
        const reason = result.reason;
        const message = reason instanceof Error ? reason.message : String(reason);
        this.logger.warn(`External notify failed: ${message}`);
      }
    }
  }

  isTelegramConfigured(): boolean {
    return !!this.telegramBotToken;
  }

  isMaxConfigured(): boolean {
    return !!this.maxBotToken;
  }

  private async sendTelegram(chatId: string, text: string): Promise<void> {
    if (!this.telegramBotToken) return;
    const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
    const body = text.length > 4096 ? text.slice(0, 4093) + '...' : text;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: body }),
    });
    const data = (await response.json()) as { ok?: boolean; description?: string };
    if (!response.ok || !data.ok) {
      throw new Error(`Telegram: ${data.description || response.statusText}`);
    }
  }

  private async sendMax(chatId: string, text: string): Promise<void> {
    if (!this.maxBotToken) return;
    const body = text.length > 4000 ? text.slice(0, 3997) + '...' : text;
    const url = new URL(`${this.maxApiBaseUrl.replace(/\/$/, '')}/messages`);
    url.searchParams.set('chat_id', chatId);
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: this.maxBotToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: body }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`MAX network error for chat ${chatId}: ${message}`);
      throw err;
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      this.logger.warn(`MAX API ${response.status} for chat ${chatId}: ${errText}`);
      throw new Error(`MAX: ${response.status} ${errText}`);
    }
  }
}
