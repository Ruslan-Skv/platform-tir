import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { QuizOption } from './quiz.types';

interface QuizNotifyContext {
  quizTitle: string;
  name: string;
  phone: string;
  answers: Record<string, string>;
  stepLabels: Map<string, { title: string; options?: QuizOption[] }>;
  notifyEmails: string[];
  notifyTelegramIds: string[];
  notifyPhones: string[];
}

@Injectable()
export class QuizNotifierService {
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

  async notifySubmission(
    quizId: string,
    payload: Omit<QuizNotifyContext, 'notifyEmails' | 'notifyTelegramIds' | 'notifyPhones'>,
  ): Promise<void> {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { id: quizId } });
    if (!quiz) return;

    const notifyEmails = this.parseStringArray(quiz.notifyEmails);
    const notifyTelegramIds = this.parseStringArray(quiz.notifyTelegramIds);
    const notifyPhones = this.parseStringArray(quiz.notifyPhones);

    const text = this.buildText({ ...payload, notifyEmails, notifyTelegramIds, notifyPhones });
    const html = this.buildHtml({ ...payload, notifyEmails, notifyTelegramIds, notifyPhones });
    const subject = `Квиз «${payload.quizTitle}» — ${payload.name}`;

    await Promise.allSettled([
      ...notifyEmails.map((email) =>
        this.mailer.sendMail({
          from: `"Квиз: ${payload.quizTitle}" <${this.mailFrom}>`,
          to: email,
          subject,
          html,
          text,
        }),
      ),
      ...(this.telegramBotToken
        ? notifyTelegramIds.map((chatId) => this.sendTelegram(chatId, text))
        : []),
    ]);
  }

  private parseStringArray(value: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  }

  private formatAnswer(
    key: string,
    value: string,
    stepLabels: Map<string, { title: string; options?: QuizOption[] }>,
  ): string {
    const meta = stepLabels.get(key);
    if (!meta) return value;
    const option = meta.options?.find((o) => o.value === value);
    return option?.label ?? value;
  }

  private buildLines(ctx: QuizNotifyContext): string[] {
    const lines = [
      `Квиз: ${ctx.quizTitle}`,
      `Имя: ${ctx.name}`,
      `Телефон: ${ctx.phone}`,
      '',
      'Ответы:',
    ];
    for (const [key, value] of Object.entries(ctx.answers)) {
      if (key === 'name' || key === 'phone') continue;
      const label = ctx.stepLabels.get(key)?.title ?? key;
      lines.push(`• ${label}: ${this.formatAnswer(key, value, ctx.stepLabels)}`);
    }
    if (ctx.notifyPhones.length > 0) {
      lines.push('', `Менеджеры (тел.): ${ctx.notifyPhones.join(', ')}`);
    }
    return lines;
  }

  private buildText(ctx: QuizNotifyContext): string {
    return this.buildLines(ctx).join('\n');
  }

  private buildHtml(ctx: QuizNotifyContext): string {
    const escaped = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rows = Object.entries(ctx.answers)
      .filter(([key]) => key !== 'name' && key !== 'phone')
      .map(([key, value]) => {
        const label = ctx.stepLabels.get(key)?.title ?? key;
        return `<tr><td><strong>${escaped(label)}</strong></td><td>${escaped(this.formatAnswer(key, value, ctx.stepLabels))}</td></tr>`;
      })
      .join('');
    return `<h2>Новая заявка с квиза «${escaped(ctx.quizTitle)}»</h2>
<p><strong>Имя:</strong> ${escaped(ctx.name)}<br/>
<strong>Телефон:</strong> ${escaped(ctx.phone)}</p>
<table border="1" cellpadding="8" cellspacing="0">${rows}</table>`;
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
    if (!response.ok) {
      const data = (await response.json()) as { description?: string };
      throw new Error(`Telegram: ${data.description || response.statusText}`);
    }
  }
}
