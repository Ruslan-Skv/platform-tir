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
    return this.prisma.formSubmission.create({
      data: {
        type: 'measurement',
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        preferredDate: dto.preferredDate,
        preferredTime: dto.preferredTime,
        productType: dto.productType,
        comment: dto.comments,
      },
    });
  }

  async submitCallback(dto: SubmitCallbackDto) {
    return this.prisma.formSubmission.create({
      data: {
        type: 'callback',
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        preferredTime: dto.preferredTime,
        comment: dto.comment,
      },
    });
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
