import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeStringArray, parseStringArray } from '../../external-notify/external-notify.util';
import { UpdateExternalNotifySettingsDto } from './dto/update-external-notify-settings.dto';

export type ExternalNotifyEvent =
  | 'order'
  | 'knowledge_feedback'
  | 'site_feedback'
  | 'support_chat'
  | 'review'
  | 'comment'
  | 'knowledge_training'
  | 'work_day'
  | 'waybill';

@Injectable()
export class AdminExternalNotifyService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const block = await this.ensureSettings();
    return this.mapSettings(block);
  }

  async updateSettings(dto: UpdateExternalNotifySettingsDto) {
    const data: Prisma.ExternalNotifySettingsUpdateInput = { updatedAt: new Date() };

    if (dto.orderNotifyEmails !== undefined) {
      data.orderNotifyEmails = normalizeStringArray(dto.orderNotifyEmails);
    }
    if (dto.orderNotifyTelegramIds !== undefined) {
      data.orderNotifyTelegramIds = normalizeStringArray(dto.orderNotifyTelegramIds);
    }
    if (dto.orderNotifyMaxIds !== undefined) {
      data.orderNotifyMaxIds = normalizeStringArray(dto.orderNotifyMaxIds);
    }
    if (dto.knowledgeFeedbackNotifyEmails !== undefined) {
      data.knowledgeFeedbackNotifyEmails = normalizeStringArray(dto.knowledgeFeedbackNotifyEmails);
    }
    if (dto.knowledgeFeedbackNotifyTelegramIds !== undefined) {
      data.knowledgeFeedbackNotifyTelegramIds = normalizeStringArray(
        dto.knowledgeFeedbackNotifyTelegramIds,
      );
    }
    if (dto.knowledgeFeedbackNotifyMaxIds !== undefined) {
      data.knowledgeFeedbackNotifyMaxIds = normalizeStringArray(dto.knowledgeFeedbackNotifyMaxIds);
    }
    if (dto.siteFeedbackNotifyEmails !== undefined) {
      data.siteFeedbackNotifyEmails = normalizeStringArray(dto.siteFeedbackNotifyEmails);
    }
    if (dto.siteFeedbackNotifyTelegramIds !== undefined) {
      data.siteFeedbackNotifyTelegramIds = normalizeStringArray(dto.siteFeedbackNotifyTelegramIds);
    }
    if (dto.siteFeedbackNotifyMaxIds !== undefined) {
      data.siteFeedbackNotifyMaxIds = normalizeStringArray(dto.siteFeedbackNotifyMaxIds);
    }
    if (dto.supportNotifyEmails !== undefined) {
      data.supportNotifyEmails = normalizeStringArray(dto.supportNotifyEmails);
    }
    if (dto.supportNotifyTelegramIds !== undefined) {
      data.supportNotifyTelegramIds = normalizeStringArray(dto.supportNotifyTelegramIds);
    }
    if (dto.supportNotifyMaxIds !== undefined) {
      data.supportNotifyMaxIds = normalizeStringArray(dto.supportNotifyMaxIds);
    }
    if (dto.reviewNotifyEmails !== undefined) {
      data.reviewNotifyEmails = normalizeStringArray(dto.reviewNotifyEmails);
    }
    if (dto.reviewNotifyTelegramIds !== undefined) {
      data.reviewNotifyTelegramIds = normalizeStringArray(dto.reviewNotifyTelegramIds);
    }
    if (dto.reviewNotifyMaxIds !== undefined) {
      data.reviewNotifyMaxIds = normalizeStringArray(dto.reviewNotifyMaxIds);
    }
    if (dto.commentNotifyEmails !== undefined) {
      data.commentNotifyEmails = normalizeStringArray(dto.commentNotifyEmails);
    }
    if (dto.commentNotifyTelegramIds !== undefined) {
      data.commentNotifyTelegramIds = normalizeStringArray(dto.commentNotifyTelegramIds);
    }
    if (dto.commentNotifyMaxIds !== undefined) {
      data.commentNotifyMaxIds = normalizeStringArray(dto.commentNotifyMaxIds);
    }
    if (dto.knowledgeTrainingNotifyEmails !== undefined) {
      data.knowledgeTrainingNotifyEmails = normalizeStringArray(dto.knowledgeTrainingNotifyEmails);
    }
    if (dto.knowledgeTrainingNotifyTelegramIds !== undefined) {
      data.knowledgeTrainingNotifyTelegramIds = normalizeStringArray(
        dto.knowledgeTrainingNotifyTelegramIds,
      );
    }
    if (dto.knowledgeTrainingNotifyMaxIds !== undefined) {
      data.knowledgeTrainingNotifyMaxIds = normalizeStringArray(dto.knowledgeTrainingNotifyMaxIds);
    }
    if (dto.workDayNotifyEmails !== undefined) {
      data.workDayNotifyEmails = normalizeStringArray(dto.workDayNotifyEmails);
    }
    if (dto.workDayNotifyTelegramIds !== undefined) {
      data.workDayNotifyTelegramIds = normalizeStringArray(dto.workDayNotifyTelegramIds);
    }
    if (dto.workDayNotifyMaxIds !== undefined) {
      data.workDayNotifyMaxIds = normalizeStringArray(dto.workDayNotifyMaxIds);
    }
    if (dto.waybillNotifyEmails !== undefined) {
      data.waybillNotifyEmails = normalizeStringArray(dto.waybillNotifyEmails);
    }
    if (dto.waybillNotifyTelegramIds !== undefined) {
      data.waybillNotifyTelegramIds = normalizeStringArray(dto.waybillNotifyTelegramIds);
    }
    if (dto.waybillNotifyMaxIds !== undefined) {
      data.waybillNotifyMaxIds = normalizeStringArray(dto.waybillNotifyMaxIds);
    }

    const block = await this.prisma.externalNotifySettings.update({
      where: { id: 'main' },
      data,
    });
    return this.mapSettings(block);
  }

  async getChannelsForEvent(event: ExternalNotifyEvent) {
    const block = await this.ensureSettings();
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
    }
  }

  private async ensureSettings() {
    return this.prisma.externalNotifySettings.upsert({
      where: { id: 'main' },
      create: { id: 'main' },
      update: {},
    });
  }

  private mapSettings(block: {
    orderNotifyEmails: Prisma.JsonValue | null;
    orderNotifyTelegramIds: Prisma.JsonValue | null;
    orderNotifyMaxIds: Prisma.JsonValue | null;
    knowledgeFeedbackNotifyEmails: Prisma.JsonValue | null;
    knowledgeFeedbackNotifyTelegramIds: Prisma.JsonValue | null;
    knowledgeFeedbackNotifyMaxIds: Prisma.JsonValue | null;
    siteFeedbackNotifyEmails: Prisma.JsonValue | null;
    siteFeedbackNotifyTelegramIds: Prisma.JsonValue | null;
    siteFeedbackNotifyMaxIds: Prisma.JsonValue | null;
    supportNotifyEmails: Prisma.JsonValue | null;
    supportNotifyTelegramIds: Prisma.JsonValue | null;
    supportNotifyMaxIds: Prisma.JsonValue | null;
    reviewNotifyEmails: Prisma.JsonValue | null;
    reviewNotifyTelegramIds: Prisma.JsonValue | null;
    reviewNotifyMaxIds: Prisma.JsonValue | null;
    commentNotifyEmails: Prisma.JsonValue | null;
    commentNotifyTelegramIds: Prisma.JsonValue | null;
    commentNotifyMaxIds: Prisma.JsonValue | null;
    knowledgeTrainingNotifyEmails: Prisma.JsonValue | null;
    knowledgeTrainingNotifyTelegramIds: Prisma.JsonValue | null;
    knowledgeTrainingNotifyMaxIds: Prisma.JsonValue | null;
    workDayNotifyEmails: Prisma.JsonValue | null;
    workDayNotifyTelegramIds: Prisma.JsonValue | null;
    workDayNotifyMaxIds: Prisma.JsonValue | null;
    waybillNotifyEmails: Prisma.JsonValue | null;
    waybillNotifyTelegramIds: Prisma.JsonValue | null;
    waybillNotifyMaxIds: Prisma.JsonValue | null;
    updatedAt: Date;
  }) {
    return {
      orderNotifyEmails: parseStringArray(block.orderNotifyEmails),
      orderNotifyTelegramIds: parseStringArray(block.orderNotifyTelegramIds),
      orderNotifyMaxIds: parseStringArray(block.orderNotifyMaxIds),
      knowledgeFeedbackNotifyEmails: parseStringArray(block.knowledgeFeedbackNotifyEmails),
      knowledgeFeedbackNotifyTelegramIds: parseStringArray(
        block.knowledgeFeedbackNotifyTelegramIds,
      ),
      knowledgeFeedbackNotifyMaxIds: parseStringArray(block.knowledgeFeedbackNotifyMaxIds),
      siteFeedbackNotifyEmails: parseStringArray(block.siteFeedbackNotifyEmails),
      siteFeedbackNotifyTelegramIds: parseStringArray(block.siteFeedbackNotifyTelegramIds),
      siteFeedbackNotifyMaxIds: parseStringArray(block.siteFeedbackNotifyMaxIds),
      supportNotifyEmails: parseStringArray(block.supportNotifyEmails),
      supportNotifyTelegramIds: parseStringArray(block.supportNotifyTelegramIds),
      supportNotifyMaxIds: parseStringArray(block.supportNotifyMaxIds),
      reviewNotifyEmails: parseStringArray(block.reviewNotifyEmails),
      reviewNotifyTelegramIds: parseStringArray(block.reviewNotifyTelegramIds),
      reviewNotifyMaxIds: parseStringArray(block.reviewNotifyMaxIds),
      commentNotifyEmails: parseStringArray(block.commentNotifyEmails),
      commentNotifyTelegramIds: parseStringArray(block.commentNotifyTelegramIds),
      commentNotifyMaxIds: parseStringArray(block.commentNotifyMaxIds),
      knowledgeTrainingNotifyEmails: parseStringArray(block.knowledgeTrainingNotifyEmails),
      knowledgeTrainingNotifyTelegramIds: parseStringArray(
        block.knowledgeTrainingNotifyTelegramIds,
      ),
      knowledgeTrainingNotifyMaxIds: parseStringArray(block.knowledgeTrainingNotifyMaxIds),
      workDayNotifyEmails: parseStringArray(block.workDayNotifyEmails),
      workDayNotifyTelegramIds: parseStringArray(block.workDayNotifyTelegramIds),
      workDayNotifyMaxIds: parseStringArray(block.workDayNotifyMaxIds),
      waybillNotifyEmails: parseStringArray(block.waybillNotifyEmails),
      waybillNotifyTelegramIds: parseStringArray(block.waybillNotifyTelegramIds),
      waybillNotifyMaxIds: parseStringArray(block.waybillNotifyMaxIds),
      updatedAt: block.updatedAt.toISOString(),
    };
  }
}
