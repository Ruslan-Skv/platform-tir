import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../database/prisma.service';
import { SubmitCallbackDto } from './dto/submit-callback.dto';
import { SubmitDirectorMessageDto } from './dto/submit-director-message.dto';
import { SubmitMeasurementDto } from './dto/submit-measurement.dto';

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
  ) {}

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

    const block = await this.prisma.measurementFormBlock.findUnique({
      where: { id: 'main' },
    });
    const recipientEmail = block?.recipientEmail?.trim();
    if (recipientEmail) {
      const from = this.config.get<string>('MAIL_FROM') || 'noreply@example.com';
      const subject = `Заявка на замер — ${dto.name}`;
      try {
        await this.mailer.sendMail({
          from: `"Сайт: Заявка на замер" <${from}>`,
          to: recipientEmail,
          replyTo: dto.email || undefined,
          subject,
          html: this.buildMeasurementEmailHtml(dto),
          text: this.buildMeasurementEmailText(dto),
        });
      } catch (err) {
        console.error('FormsService.submitMeasurement sendMail error:', err);
        const isDev = this.config.get('NODE_ENV') !== 'production';
        if (!isDev) {
          throw new BadRequestException('Не удалось отправить заявку. Попробуйте позже.');
        }
        console.warn(
          'Письмо не отправлено (SMTP/MailHog недоступен). Заявка сохранена. Запустите: docker compose up -d mailhog',
        );
      }
    }

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

    const block = await this.prisma.callbackFormBlock.findUnique({
      where: { id: 'main' },
    });
    const recipientEmail = block?.recipientEmail?.trim();
    if (recipientEmail) {
      const from = this.config.get<string>('MAIL_FROM') || 'noreply@example.com';
      const subject = `Заказ обратного звонка — ${dto.name}`;
      try {
        await this.mailer.sendMail({
          from: `"Сайт: Обратный звонок" <${from}>`,
          to: recipientEmail,
          replyTo: dto.email || undefined,
          subject,
          html: this.buildCallbackEmailHtml(dto),
          text: this.buildCallbackEmailText(dto),
        });
      } catch (err) {
        console.error('FormsService.submitCallback sendMail error:', err);
        const isDev = this.config.get('NODE_ENV') !== 'production';
        if (!isDev) {
          throw new BadRequestException('Не удалось отправить заявку. Попробуйте позже.');
        }
        console.warn(
          'Письмо не отправлено (SMTP/MailHog недоступен). Заявка сохранена. Запустите: docker compose up -d mailhog',
        );
      }
    }

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
    const directorEmail = block?.directorEmail?.trim();
    if (!directorEmail) {
      throw new BadRequestException(
        'Форма «Письмо директору» временно недоступна. Укажите email директора в настройках админки.',
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

    const from = this.config.get<string>('MAIL_FROM') || 'noreply@example.com';
    const subjectLabel = SUBJECT_LABELS[dto.subject] || dto.subject;
    const subject = `Письмо директору: ${subjectLabel} — от ${dto.name}`;

    try {
      await this.mailer.sendMail({
        from: `"Сайт: Письмо директору" <${from}>`,
        to: directorEmail,
        replyTo: dto.email,
        subject,
        html: this.buildDirectorMessageHtml(dto),
        text: this.buildDirectorMessageText(dto),
      });
    } catch (err) {
      console.error('FormsService.submitDirectorMessage sendMail error:', err);
      // В режиме разработки без MailHog — сохраняем заявку и возвращаем успех
      const isDev = this.config.get('NODE_ENV') !== 'production';
      if (isDev) {
        console.warn(
          'Письмо не отправлено (SMTP/MailHog недоступен). Заявка сохранена. Для локальной отправки запустите: docker compose up -d mailhog',
        );
      } else {
        throw new BadRequestException('Не удалось отправить письмо. Попробуйте позже.');
      }
    }

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
}
