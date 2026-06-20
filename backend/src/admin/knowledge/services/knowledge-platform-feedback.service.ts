import { BadRequestException, Injectable } from '@nestjs/common';
import { KnowledgePlatformFeedbackType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AdminBellPushService } from '../../../bell-push/admin-bell-push.service';

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

    return {
      feedback: mapFeedbackItem(feedback),
    };
  }
}
