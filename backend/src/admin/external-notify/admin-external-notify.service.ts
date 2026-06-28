import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeStringArray, parseStringArray } from '../../external-notify/external-notify.util';
import { UpdateExternalNotifySettingsDto } from './dto/update-external-notify-settings.dto';

export type ExternalNotifyEvent = 'order' | 'knowledge_feedback' | 'site_feedback';

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
      updatedAt: block.updatedAt.toISOString(),
    };
  }
}
