import { BadRequestException, Injectable } from '@nestjs/common';
import { KnowledgePlatformFeedbackType, Prisma } from '@prisma/client';
import { AdminBellPushService } from '../bell-push/admin-bell-push.service';
import { ExternalNotifyService } from '../external-notify/external-notify.service';
import { ExternalNotifySettingsService } from '../external-notify/external-notify-settings.service';
import { PrismaService } from '../database/prisma.service';
import { CreateSitePlatformFeedbackDto } from './dto/create-site-platform-feedback.dto';

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
  pageUrl: string | null;
  senderName: string | null;
  senderEmail: string | null;
  senderPhone: string | null;
  createdAt: Date;
  readAt?: Date | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}) {
  return {
    id: item.id,
    type: item.type,
    text: item.text,
    pageUrl: item.pageUrl,
    senderName: item.senderName,
    senderEmail: item.senderEmail,
    senderPhone: item.senderPhone,
    createdAt: item.createdAt.toISOString(),
    readAt: item.readAt?.toISOString() ?? null,
    author: item.user,
  };
}

const FEEDBACK_LIST_SELECT = {
  id: true,
  type: true,
  text: true,
  pageUrl: true,
  senderName: true,
  senderEmail: true,
  senderPhone: true,
  createdAt: true,
  readAt: true,
  user: { select: FEEDBACK_AUTHOR_SELECT },
} as const;

@Injectable()
export class SitePlatformFeedbackService {
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
    const where: Prisma.SitePlatformFeedbackWhereInput = {};
    if (options?.type) where.type = options.type;
    if (options?.unreadOnly) where.readAt = null;

    const items = await this.prisma.sitePlatformFeedback.findMany({
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
    const result = await this.prisma.sitePlatformFeedback.updateMany({
      where: { readAt: null },
      data: { readAt: new Date(), status: 'completed' },
    });
    return { marked: result.count };
  }

  async createFeedback(dto: CreateSitePlatformFeedbackDto, userId?: string) {
    const trimmed = dto.text.trim();
    if (!trimmed) {
      throw new BadRequestException('Текст не может быть пустым');
    }

    const senderName = dto.senderName.trim();
    const pageUrl = dto.pageUrl?.trim() || null;
    const senderEmail = dto.senderEmail?.trim() || null;
    const senderPhone = dto.senderPhone?.trim() || null;

    const feedback = await this.prisma.sitePlatformFeedback.create({
      data: {
        userId: userId ?? null,
        senderName,
        senderEmail,
        senderPhone,
        type: dto.type,
        text: trimmed,
        pageUrl,
      },
      select: {
        id: true,
        type: true,
        text: true,
        pageUrl: true,
        senderName: true,
        senderEmail: true,
        senderPhone: true,
        createdAt: true,
        user: { select: FEEDBACK_AUTHOR_SELECT },
      },
    });

    const authorName = feedback.user
      ? `${feedback.user.firstName ?? ''} ${feedback.user.lastName ?? ''}`.trim() ||
        feedback.user.email
      : senderName;
    const title = dto.type === 'BUG' ? 'Ошибка на сайте' : 'Предложение по сайту';
    void this.adminBellPush.notify('site_feedback', {
      title,
      body: `От ${authorName}`,
      url: '/admin/content/site-feedback',
      tag: `site-feedback-${feedback.id}`,
    });

    const contactLines = [
      senderEmail ? `Email: ${senderEmail}` : null,
      senderPhone ? `Телефон: ${senderPhone}` : null,
      pageUrl ? `Страница: ${pageUrl}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    void this.externalNotifySettings.getChannelsForEvent('site_feedback').then((channels) =>
      this.externalNotify.send(channels, {
        subject: title,
        text: `${title}\n\nОт: ${authorName}\n${contactLines}\n\n${trimmed}`,
        fromLabel: 'Обратная связь по сайту',
      }),
    );

    return {
      feedback: mapFeedbackItem(feedback),
    };
  }
}
