import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../database/prisma.service';
import { AdminBellPushService } from '../bell-push/admin-bell-push.service';
import { FormNotifierService } from './form-notifier.service';
import { SubmitCallbackDto } from './dto/submit-callback.dto';
import { SubmitDirectorMessageDto } from './dto/submit-director-message.dto';
import { SubmitMeasurementDto } from './dto/submit-measurement.dto';
import { SubmitQuoteDto } from './dto/submit-quote.dto';

const SUBJECT_LABELS: Record<string, string> = {
  complaint: 'Жалоба',
  suggestion: 'Предложение',
  cooperation: 'Сотрудничество',
  question: 'Вопрос',
  other: 'Другое',
};

@Injectable()
export class FormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
    private readonly formNotifier: FormNotifierService,
    private readonly adminBellPush: AdminBellPushService,
  ) {}

  async getQuoteFormOptions(): Promise<{ options: string[] }> {
    const block = await this.prisma.quoteFormBlock.findUnique({
      where: { id: 'main' },
    });
    const opts = block?.serviceTypeOptions;
    const raw = Array.isArray(opts) ? opts : [];
    const options = raw.filter((x): x is string => typeof x === 'string');
    return { options };
  }

  async submitMeasurement(dto: SubmitMeasurementDto) {
    const submission = await this.prisma.formSubmission.create({
      data: {
        type: 'measurement',
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        preferredDate: dto.preferredDate,
        preferredTime: dto.preferredTime ?? '',
        productType: dto.productType,
        comment: dto.comments,
      },
    });

    await this.formNotifier.notify('measurement', {
      subject: `Заявка на замер — ${dto.name}`,
      html: this.buildMeasurementEmailHtml(dto),
      text: this.buildMeasurementEmailText(dto),
      replyTo: dto.email || undefined,
    });

    void this.adminBellPush.notify('form_measurement', {
      title: 'Запись на замер',
      body: `${dto.name}, ${dto.phone}`,
      url: '/admin/forms',
      tag: `form-measurement-${submission.id}`,
    });

    return submission;
  }

  private buildMeasurementEmailHtml(dto: SubmitMeasurementDto): string {
    const escaped = (s: string) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Заявка на замер</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1>Новая заявка на бесплатный замер</h1>
  <p><strong>Имя:</strong> ${escaped(dto.name)}</p>
  <p><strong>Телефон:</strong> ${escaped(dto.phone)}</p>
  <p><strong>Email:</strong> ${escaped(dto.email)}</p>
  <p><strong>Адрес:</strong> ${escaped(dto.address)}</p>
  <p><strong>Желаемая дата:</strong> ${escaped(dto.preferredDate)}</p>
  <p><strong>Желаемое время:</strong> ${escaped(dto.preferredTime ?? '')}</p>
  <p><strong>Тип продукта:</strong> ${escaped(dto.productType)}</p>
  ${dto.comments ? `<hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;"><p><strong>Комментарий:</strong></p><div style="white-space: pre-wrap;">${escaped(dto.comments)}</div>` : ''}
</body>
</html>`;
  }

  private buildMeasurementEmailText(dto: SubmitMeasurementDto): string {
    return `Новая заявка на бесплатный замер

Имя: ${dto.name}
Телефон: ${dto.phone}
Email: ${dto.email}
Адрес: ${dto.address}
Желаемая дата: ${dto.preferredDate}
Желаемое время: ${dto.preferredTime}
Тип продукта: ${dto.productType}
${dto.comments ? `\nКомментарий:\n${dto.comments}` : ''}`;
  }

  async submitCallback(dto: SubmitCallbackDto) {
    const submission = await this.prisma.formSubmission.create({
      data: {
        type: 'callback',
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        preferredTime: dto.preferredTime ?? '',
        comment: dto.comment,
      },
    });

    await this.formNotifier.notify('callback', {
      subject: `Заказ обратного звонка — ${dto.name}`,
      html: this.buildCallbackEmailHtml(dto),
      text: this.buildCallbackEmailText(dto),
      replyTo: dto.email || undefined,
    });

    void this.adminBellPush.notify('form_callback', {
      title: 'Обратный звонок',
      body: `${dto.name}, ${dto.phone}`,
      url: '/admin/forms',
      tag: `form-callback-${submission.id}`,
    });

    return submission;
  }

  private buildCallbackEmailHtml(dto: SubmitCallbackDto): string {
    const escaped = (s: string) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Заказ обратного звонка</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1>Новая заявка на обратный звонок</h1>
  <p><strong>Имя:</strong> ${escaped(dto.name)}</p>
  <p><strong>Телефон:</strong> ${escaped(dto.phone)}</p>
  ${dto.email ? `<p><strong>Email:</strong> ${escaped(dto.email)}</p>` : ''}
  <p><strong>Удобное время:</strong> ${escaped(dto.preferredTime ?? '')}</p>
  ${dto.comment ? `<hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;"><p><strong>Комментарий:</strong></p><div style="white-space: pre-wrap;">${escaped(dto.comment)}</div>` : ''}
</body>
</html>`;
  }

  private buildCallbackEmailText(dto: SubmitCallbackDto): string {
    return `Новая заявка на обратный звонок

Имя: ${dto.name}
Телефон: ${dto.phone}
${dto.email ? `Email: ${dto.email}\n` : ''}Удобное время: ${dto.preferredTime ?? ''}
${dto.comment ? `\nКомментарий:\n${dto.comment}` : ''}`;
  }

  async submitDirectorMessage(dto: SubmitDirectorMessageDto) {
    const block = await this.prisma.directorMessageBlock.findUnique({
      where: { id: 'main' },
    });
    const hasEmail = !!block?.directorEmail?.trim();
    const hasTelegram = !!block?.telegramChatId?.trim() && !!this.config.get('TELEGRAM_BOT_TOKEN');
    if (!hasEmail && !hasTelegram) {
      throw new BadRequestException(
        'Форма «Письмо директору» временно недоступна. Укажите email директора или Telegram в настройках админки.',
      );
    }

    const submission = await this.prisma.formSubmission.create({
      data: {
        type: 'director',
        name: dto.name,
        phone: dto.phone ?? '',
        email: dto.email,
        preferredTime: '',
        subject: dto.subject,
        comment: dto.message,
      },
    });

    const subjectLabel = SUBJECT_LABELS[dto.subject] || dto.subject;
    await this.formNotifier.notify('director', {
      subject: `Письмо директору: ${subjectLabel} — от ${dto.name}`,
      html: this.buildDirectorMessageHtml(dto),
      text: this.buildDirectorMessageText(dto),
      replyTo: dto.email,
    });

    void this.adminBellPush.notify('form_director', {
      title: 'Письмо директору',
      body: `${dto.name}, ${dto.email}`,
      url: '/admin/forms',
      tag: `form-director-${submission.id}`,
    });

    return submission;
  }

  private buildDirectorMessageHtml(dto: SubmitDirectorMessageDto): string {
    const subjectLabel = SUBJECT_LABELS[dto.subject] || dto.subject;
    const escapedMessage = dto.message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subjectLabel}</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1>Письмо директору: ${subjectLabel}</h1>
  <p><strong>От:</strong> ${dto.name} &lt;${dto.email}&gt;</p>
  ${dto.phone ? `<p><strong>Телефон:</strong> ${dto.phone}</p>` : ''}
  <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;">
  <div style="white-space: pre-wrap;">${escapedMessage}</div>
</body>
</html>`;
  }

  private buildDirectorMessageText(dto: SubmitDirectorMessageDto): string {
    return `Письмо директору: ${SUBJECT_LABELS[dto.subject] || dto.subject}

От: ${dto.name} <${dto.email}>
${dto.phone ? `Телефон: ${dto.phone}\n` : ''}
---
${dto.message}`;
  }

  async submitQuote(dto: SubmitQuoteDto) {
    const submission = await this.prisma.formSubmission.create({
      data: {
        type: 'quote',
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        address: dto.address ?? null,
        preferredDate: null,
        preferredTime: '',
        productType: dto.serviceType,
        comment: dto.comment,
      },
    });

    await this.formNotifier.notify('quote', {
      subject: `Заявка на расчёт стоимости — ${dto.name}`,
      html: this.buildQuoteEmailHtml(dto),
      text: this.buildQuoteEmailText(dto),
      replyTo: dto.email || undefined,
    });

    void this.adminBellPush.notify('form_quote', {
      title: 'Рассчитать стоимость',
      body: `${dto.name}, ${dto.phone}`,
      url: '/admin/forms',
      tag: `form-quote-${submission.id}`,
    });

    return submission;
  }

  private buildQuoteEmailHtml(dto: SubmitQuoteDto): string {
    const escaped = (s: string) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Заявка на расчёт стоимости</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1>Новая заявка на расчёт стоимости</h1>
  <p><strong>Имя:</strong> ${escaped(dto.name)}</p>
  <p><strong>Телефон:</strong> ${escaped(dto.phone)}</p>
  ${dto.email ? `<p><strong>Email:</strong> ${escaped(dto.email)}</p>` : ''}
  <p><strong>Вид работ:</strong> ${escaped(dto.serviceType)}</p>
  ${dto.address ? `<p><strong>Адрес / описание:</strong> ${escaped(dto.address)}</p>` : ''}
  ${dto.comment ? `<hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;"><p><strong>Комментарий:</strong></p><div style="white-space: pre-wrap;">${escaped(dto.comment)}</div>` : ''}
</body>
</html>`;
  }

  private buildQuoteEmailText(dto: SubmitQuoteDto): string {
    return `Новая заявка на расчёт стоимости

Имя: ${dto.name}
Телефон: ${dto.phone}
${dto.email ? `Email: ${dto.email}\n` : ''}Вид работ: ${dto.serviceType}
${dto.address ? `Адрес / описание: ${dto.address}\n` : ''}${dto.comment ? `\nКомментарий:\n${dto.comment}` : ''}`;
  }
}
