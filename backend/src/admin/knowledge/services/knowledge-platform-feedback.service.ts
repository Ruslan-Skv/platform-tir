import { BadRequestException, Injectable } from '@nestjs/common';
import { KnowledgePlatformFeedbackType, Prisma } from '@prisma/client';
import { AdminBellPushService } from '../../../bell-push/admin-bell-push.service';
import { ExternalNotifyService } from '../../../external-notify/external-notify.service';
import { ExternalNotifySettingsService } from '../../../external-notify/external-notify-settings.service';
import { PrismaService } from '../../../database/prisma.service';

const FEEDBACK_AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

function mapFeedbackItem(item: {
  id: string;
  type: KnowledgePlatformFeedbackType;
  text: string;
  createdAt: Date;
  readAt?: Date | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}) {
  return {
    id: item.id,
    type: item.type,
    text: item.text,
    createdAt: item.createdAt.toISOString(),
    readAt: item.readAt?.toISOString() ?? null,
    author: item.user,
  };
}

const FEEDBACK_LIST_SELECT = {
  id: true,
  type: true,
  text: true,
  createdAt: true,
  readAt: true,
  user: { select: FEEDBACK_AUTHOR_SELECT },
} as const;

@Injectable()
export class KnowledgePlatformFeedbackService {
  constructor(
    private prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
    private readonly externalNotify: ExternalNotifyService,
    private readonly externalNotifySettings: ExternalNotifySettingsService,
  ) {}

  async listFeedback(options?: {
    type?: KnowledgePlatformFeedbackType;
    unreadOnly?: boolean;
    limit?: number;
  }) {
    const where: Prisma.KnowledgePlatformFeedbackWhereInput = {};
    if (options?.type) where.type = options.type;
    if (options?.unreadOnly) where.readAt = null;

    const items = await this.prisma.knowledgePlatformFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 200,
      select: FEEDBACK_LIST_SELECT,
    });

    return {
      items: items.map(mapFeedbackItem),
    };
  }

  async markAllAsRead() {
    const result = await this.prisma.knowledgePlatformFeedback.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });
    return { marked: result.count };
  }

  async createFeedback(userId: string, type: KnowledgePlatformFeedbackType, text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('Текст не может быть пустым');
    }

    const feedback = await this.prisma.knowledgePlatformFeedback.create({
      data: {
        userId,
        type,
        text: trimmed,
      },
      select: {
        id: true,
        type: true,
        text: true,
        createdAt: true,
        user: { select: FEEDBACK_AUTHOR_SELECT },
      },
    });

    const authorName =
      `${feedback.user.firstName ?? ''} ${feedback.user.lastName ?? ''}`.trim() ||
      feedback.user.email;
    const title =
      type === 'BUG' ? 'Ошибка на обучающей платформе' : 'Предложение по обучающей платформе';
    void this.adminBellPush.notify('knowledge_feedback', {
      title,
      body: `От ${authorName}`,
      url: '/admin/knowledge/feedback',
      tag: `knowledge-feedback-${feedback.id}`,
    });

    void this.externalNotifySettings.getChannelsForEvent('knowledge_feedback').then((channels) =>
      this.externalNotify.send(channels, {
        subject: title,
        text: `${title}\n\nОт: ${authorName}\nEmail: ${feedback.user.email}\n\n${trimmed}`,
        fromLabel: 'Обучающая платформа',
      }),
    );

    return {
      feedback: mapFeedbackItem(feedback),
    };
  }
}
