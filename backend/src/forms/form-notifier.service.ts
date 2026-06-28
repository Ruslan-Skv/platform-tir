import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ExternalNotifyService } from '../external-notify/external-notify.service';
import { parseStringArray } from '../external-notify/external-notify.util';

export type FormType = 'measurement' | 'callback' | 'director' | 'quote';

export interface FormNotificationPayload {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

const FROM_LABELS: Record<FormType, string> = {
  measurement: 'Заявка на замер',
  callback: 'Обратный звонок',
  director: 'Письмо директору',
  quote: 'Рассчитать стоимость',
};

@Injectable()
export class FormNotifierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly externalNotify: ExternalNotifyService,
  ) {}

  async notify(formType: FormType, payload: FormNotificationPayload): Promise<void> {
    const channels = await this.getChannelsForForm(formType);
    await this.externalNotify.send(channels, {
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
      fromLabel: `Сайт: ${FROM_LABELS[formType]}`,
    });
  }

  async getChannelsForForm(formType: FormType) {
    switch (formType) {
      case 'measurement': {
        const block = await this.prisma.measurementFormBlock.findUnique({
          where: { id: 'main' },
        });
        return this.mapBlockChannels(block);
      }
      case 'callback': {
        const block = await this.prisma.callbackFormBlock.findUnique({
          where: { id: 'main' },
        });
        return this.mapBlockChannels(block);
      }
      case 'director': {
        const block = await this.prisma.directorMessageBlock.findUnique({
          where: { id: 'main' },
        });
        return this.mapBlockChannels(block);
      }
      case 'quote': {
        const block = await this.prisma.quoteFormBlock.findUnique({
          where: { id: 'main' },
        });
        return this.mapBlockChannels(block);
      }
    }
  }

  private mapBlockChannels(
    block: {
      notifyEmails?: unknown;
      notifyTelegramIds?: unknown;
      notifyMaxIds?: unknown;
    } | null,
  ) {
    return {
      emails: parseStringArray(block?.notifyEmails as never),
      telegramIds: parseStringArray(block?.notifyTelegramIds as never),
      maxIds: parseStringArray(block?.notifyMaxIds as never),
    };
  }
}
