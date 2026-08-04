import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { parseStringArray } from './external-notify.util';

export type ExternalNotifyEvent =
  | 'order'
  | 'knowledge_feedback'
  | 'site_feedback'
  | 'support_chat'
  | 'review'
  | 'comment'
  | 'knowledge_training'
  | 'work_day'
  | 'waybill'
  | 'installation_schedule';

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
      case 'support_chat':
        return {
          emails: parseStringArray(block.supportNotifyEmails),
          telegramIds: parseStringArray(block.supportNotifyTelegramIds),
          maxIds: parseStringArray(block.supportNotifyMaxIds),
        };
      case 'review':
        return {
          emails: parseStringArray(block.reviewNotifyEmails),
          telegramIds: parseStringArray(block.reviewNotifyTelegramIds),
          maxIds: parseStringArray(block.reviewNotifyMaxIds),
        };
      case 'comment':
        return {
          emails: parseStringArray(block.commentNotifyEmails),
          telegramIds: parseStringArray(block.commentNotifyTelegramIds),
          maxIds: parseStringArray(block.commentNotifyMaxIds),
        };
      case 'knowledge_training':
        return {
          emails: parseStringArray(block.knowledgeTrainingNotifyEmails),
          telegramIds: parseStringArray(block.knowledgeTrainingNotifyTelegramIds),
          maxIds: parseStringArray(block.knowledgeTrainingNotifyMaxIds),
        };
      case 'work_day':
        return {
          emails: parseStringArray(block.workDayNotifyEmails),
          telegramIds: parseStringArray(block.workDayNotifyTelegramIds),
          maxIds: parseStringArray(block.workDayNotifyMaxIds),
        };
      case 'waybill':
        return {
          emails: parseStringArray(block.waybillNotifyEmails),
          telegramIds: parseStringArray(block.waybillNotifyTelegramIds),
          maxIds: parseStringArray(block.waybillNotifyMaxIds),
        };
      case 'installation_schedule':
        return {
          emails: parseStringArray(block.installationScheduleNotifyEmails),
          telegramIds: parseStringArray(block.installationScheduleNotifyTelegramIds),
          maxIds: parseStringArray(block.installationScheduleNotifyMaxIds),
        };
    }
  }
}
