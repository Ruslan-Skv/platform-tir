import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AdminNotificationSettingsReaderService } from './admin-notification-settings-reader.service';
import {
  AdminPushPayload,
  AdminPushSubscriptionsService,
} from './admin-push-subscriptions.service';

export type AdminBellPushEvent =
  | 'review'
  | 'order'
  | 'support'
  | 'form_measurement'
  | 'form_callback'
  | 'form_director'
  | 'form_quote'
  | 'knowledge_feedback'
  | 'site_feedback';

const ADMIN_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'PARTNER',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
  'TRAINEE',
];

@Injectable()
export class AdminBellPushService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsReader: AdminNotificationSettingsReaderService,
    private readonly pushSubscriptions: AdminPushSubscriptionsService,
  ) {}

  async notify(event: AdminBellPushEvent, payload: AdminPushPayload) {
    if (!this.pushSubscriptions.isConfigured()) return;

    const subscriptions = await this.prisma.adminPushSubscription.findMany({
      where: {
        user: {
          role: { in: ADMIN_ROLES },
          isActive: true,
        },
      },
      select: {
        userId: true,
        user: { select: { role: true } },
      },
      distinct: ['userId'],
    });

    await Promise.allSettled(
      subscriptions.map(async (row: { userId: string; user: { role: string } }) => {
        const { userId, user } = row;
        const settings = await this.settingsReader.getSettingsForUser(userId, user.role);
        if (!settings.desktopNotifications) return;
        if (!this.isEventEnabled(event, settings, user.role)) return;
        await this.pushSubscriptions.sendToUser(userId, payload);
      }),
    );
  }

  private isEventEnabled(
    event: AdminBellPushEvent,
    settings: {
      notifyOnReviews: boolean;
      notifyOnOrders: boolean;
      notifyOnSupportChat: boolean;
      notifyOnMeasurementForm: boolean;
      notifyOnCallbackForm: boolean;
      notifyOnDirectorForm: boolean;
      notifyOnQuoteForm: boolean;
      notifyOnKnowledgeFeedback: boolean;
      notifyOnSiteFeedback: boolean;
    },
    role: string,
  ) {
    switch (event) {
      case 'review':
        return settings.notifyOnReviews !== false;
      case 'order':
        return settings.notifyOnOrders !== false;
      case 'support':
        return settings.notifyOnSupportChat !== false;
      case 'form_measurement':
        return settings.notifyOnMeasurementForm !== false;
      case 'form_callback':
        return settings.notifyOnCallbackForm !== false;
      case 'form_director':
        return settings.notifyOnDirectorForm !== false;
      case 'form_quote':
        return settings.notifyOnQuoteForm !== false;
      case 'knowledge_feedback':
        return role === 'SUPER_ADMIN' && settings.notifyOnKnowledgeFeedback !== false;
      case 'site_feedback':
        return role === 'SUPER_ADMIN' && settings.notifyOnSiteFeedback !== false;
      default:
        return false;
    }
  }
}
