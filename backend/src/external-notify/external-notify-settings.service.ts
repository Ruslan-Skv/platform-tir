import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { parseStringArray } from './external-notify.util';

export type ExternalNotifyEvent = 'order' | 'knowledge_feedback' | 'site_feedback';

@Injectable()
export class ExternalNotifySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getChannelsForEvent(event: ExternalNotifyEvent) {
    const block = await this.prisma.externalNotifySettings.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return { emails: [], telegramIds: [], maxIds: [] };
    }
    switch (event) {
      case 'order':
        return {
          emails: parseStringArray(block.orderNotifyEmails),
          telegramIds: parseStringArray(block.orderNotifyTelegramIds),
          maxIds: parseStringArray(block.orderNotifyMaxIds),
        };
      case 'knowledge_feedback':
        return {
          emails: parseStringArray(block.knowledgeFeedbackNotifyEmails),
          telegramIds: parseStringArray(block.knowledgeFeedbackNotifyTelegramIds),
          maxIds: parseStringArray(block.knowledgeFeedbackNotifyMaxIds),
        };
      case 'site_feedback':
        return {
          emails: parseStringArray(block.siteFeedbackNotifyEmails),
          telegramIds: parseStringArray(block.siteFeedbackNotifyTelegramIds),
          maxIds: parseStringArray(block.siteFeedbackNotifyMaxIds),
        };
    }
  }
}
