import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ExternalNotifyService } from '../external-notify/external-notify.service';
import { parseStringArray } from '../external-notify/external-notify.util';
import type { QuizOption } from './quiz.types';

interface QuizNotifyContext {
  quizTitle: string;
  name: string;
  phone: string;
  answers: Record<string, string>;
  stepLabels: Map<string, { title: string; options?: QuizOption[] }>;
  notifyPhones: string[];
}

@Injectable()
export class QuizNotifierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly externalNotify: ExternalNotifyService,
  ) {}

  async notifySubmission(
    quizId: string,
    payload: Omit<QuizNotifyContext, 'notifyPhones'>,
  ): Promise<void> {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { id: quizId } });
    if (!quiz) return;

    const notifyPhones = parseStringArray(quiz.notifyPhones);
    const text = this.buildText({ ...payload, notifyPhones });
    const html = this.buildHtml({ ...payload, notifyPhones });
    const subject = `Квиз «${payload.quizTitle}» — ${payload.name}`;

    await this.externalNotify.send(
      {
        emails: parseStringArray(quiz.notifyEmails),
        telegramIds: parseStringArray(quiz.notifyTelegramIds),
        maxIds: parseStringArray(quiz.notifyMaxIds),
      },
      {
        subject,
        html,
        text,
        fromLabel: `Квиз: ${payload.quizTitle}`,
      },
    );
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
}
