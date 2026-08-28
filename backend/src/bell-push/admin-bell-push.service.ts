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
  | 'quiz_mebel'
  | 'quiz_remont'
  | 'knowledge_feedback'
  | 'site_feedback'
  | 'knowledge_training'
  | 'work_day'
  | 'waybill'
  | 'installation_schedule'
  | 'repair_schedule'
  | 'furniture_schedule'
  | 'calendar_event'
  | 'messenger_message'
  | 'kanban_card';

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

  /** Точечная рассылка конкретным пользователям (с учётом их prefs). */
  async notifyUsers(userIds: string[], event: AdminBellPushEvent, payload: AdminPushPayload) {
    if (!this.pushSubscriptions.isConfigured() || userIds.length === 0) return;
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds }, isActive: true },
      select: { id: true, role: true },
    });
    await Promise.allSettled(
      users.map(async (user) => {
        const settings = await this.settingsReader.getSettingsForUser(user.id, user.role);
        if (!settings.desktopNotifications) return;
        if (!this.isEventEnabled(event, settings, user.role)) return;
        await this.pushSubscriptions.sendToUser(user.id, payload);
      }),
    );
  }

  private isEventEnabled(
    event: AdminBellPushEvent,
    settings: {
      notifyOnReviews?: boolean;
      notifyOnOrders?: boolean;
      notifyOnSupportChat?: boolean;
      notifyOnMeasurementForm?: boolean;
      notifyOnCallbackForm?: boolean;
      notifyOnDirectorForm?: boolean;
      notifyOnQuoteForm?: boolean;
      notifyOnQuizMebel?: boolean;
      notifyOnQuizRemont?: boolean;
      notifyOnKnowledgeFeedback?: boolean;
      notifyOnSiteFeedback?: boolean;
      notifyOnKnowledgeTraining?: boolean;
      notifyOnWorkDays?: boolean;
      notifyOnWaybills?: boolean;
      notifyOnInstallationSchedules?: boolean;
      notifyOnRepairSchedules?: boolean;
      notifyOnFurnitureSchedules?: boolean;
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
      case 'quiz_mebel':
        return settings.notifyOnQuizMebel !== false;
      case 'quiz_remont':
        return settings.notifyOnQuizRemont !== false;
      case 'knowledge_feedback':
        return role === 'SUPER_ADMIN' && settings.notifyOnKnowledgeFeedback !== false;
      case 'site_feedback':
        return role === 'SUPER_ADMIN' && settings.notifyOnSiteFeedback !== false;
      case 'knowledge_training':
        return settings.notifyOnKnowledgeTraining !== false;
      case 'work_day':
        return settings.notifyOnWorkDays !== false;
      case 'waybill':
        return settings.notifyOnWaybills !== false;
      case 'installation_schedule':
        return settings.notifyOnInstallationSchedules !== false;
      case 'repair_schedule':
        return settings.notifyOnRepairSchedules !== false;
      case 'furniture_schedule':
        return settings.notifyOnFurnitureSchedules !== false;
      case 'calendar_event':
        return true;
      case 'messenger_message':
        return true;
      case 'kanban_card':
        return true;
      default:
        return false;
    }
  }
}
