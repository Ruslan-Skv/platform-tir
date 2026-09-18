import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/** Флаги событий уведомлений — те же ключи, что в NOTIFY_EVENT_KEYS модуля notifications. */
export const READER_NOTIFY_EVENT_KEYS = [
  'notifyOnReviews',
  'notifyOnOrders',
  'notifyOnSupportChat',
  'notifyOnMeasurementForm',
  'notifyOnCallbackForm',
  'notifyOnDirectorForm',
  'notifyOnQuoteForm',
  'notifyOnQuizMebel',
  'notifyOnQuizRemont',
  'notifyOnKnowledgeFeedback',
  'notifyOnSiteFeedback',
  'notifyOnKnowledgeTraining',
  'notifyOnWorkDays',
  'notifyOnWorkDayRequestReviews',
  'notifyOnWaybills',
  'notifyOnInstallationSchedules',
  'notifyOnRepairSchedules',
  'notifyOnFurnitureSchedules',
  'notifyOnMeasurements',
  'notifyOnContractSigning',
] as const;

type DeliveryOverlay = {
  soundEnabled: boolean;
  soundVolume: number;
  soundType: string;
  customSoundUrl: string | null;
  desktopNotifications: boolean;
  checkIntervalSeconds: number;
};

@Injectable()
export class AdminNotificationSettingsReaderService {
  constructor(private readonly prisma: PrismaService) {}

  findBlockByRole(role: string | null) {
    if (role !== null) {
      return this.prisma.adminNotificationsBlock.findUnique({
        where: { role },
      });
    }
    return this.prisma.adminNotificationsBlock.findFirst({
      where: { role: null },
    });
  }

  getDefaultSettings() {
    return {
      id: 'default',
      role: null as string | null,
      soundEnabled: true,
      soundVolume: 70,
      soundType: 'beep',
      customSoundUrl: null as string | null,
      desktopNotifications: false,
      checkIntervalSeconds: 60,
      notifyOnReviews: true,
      notifyOnOrders: true,
      notifyOnSupportChat: true,
      notifyOnMeasurementForm: true,
      notifyOnCallbackForm: true,
      notifyOnDirectorForm: true,
      notifyOnQuoteForm: true,
      notifyOnQuizMebel: true,
      notifyOnQuizRemont: true,
      notifyOnKnowledgeFeedback: true,
      notifyOnSiteFeedback: true,
      notifyOnKnowledgeTraining: true,
      notifyOnWorkDays: true,
      notifyOnWorkDayRequestReviews: true,
      notifyOnWaybills: true,
      notifyOnInstallationSchedules: true,
      notifyOnRepairSchedules: true,
      notifyOnFurnitureSchedules: true,
      notifyOnMeasurements: true,
      notifyOnContractSigning: true,
    };
  }

  private async resolveRoleBase(userRole: string | null) {
    const block = userRole
      ? ((await this.findBlockByRole(userRole)) ?? (await this.findBlockByRole(null)))
      : await this.findBlockByRole(null);
    if (!block) return this.getDefaultSettings();
    return block;
  }

  private applyDeliveryOverlay<T extends Record<string, unknown>>(
    base: T,
    overlay: DeliveryOverlay,
  ) {
    return {
      ...base,
      soundEnabled: overlay.soundEnabled,
      soundVolume: overlay.soundVolume,
      soundType: overlay.soundType,
      customSoundUrl: overlay.customSoundUrl,
      desktopNotifications: overlay.desktopNotifications,
      checkIntervalSeconds: overlay.checkIntervalSeconds,
    };
  }

  /**
   * События, доступные роли: их задаёт супер-админ в блоке настроек роли.
   * Супер-админу доступны все события.
   */
  async getAllowedEventsForRole(userRole: string | null) {
    if (userRole === 'SUPER_ADMIN') {
      return Object.fromEntries(READER_NOTIFY_EVENT_KEYS.map((key) => [key, true]));
    }
    const base = await this.resolveRoleBase(userRole);
    return Object.fromEntries(
      READER_NOTIFY_EVENT_KEYS.map((key) => [key, (base as Record<string, unknown>)[key] ?? true]),
    );
  }

  async getSettingsForUser(userId: string | undefined, userRole: string | null) {
    const base = await this.resolveRoleBase(userRole);
    const allowedEvents = await this.getAllowedEventsForRole(userRole);
    if (userId) {
      const override = await this.prisma.userAdminNotificationOverride.findUnique({
        where: { userId },
      });
      if (override) {
        if (override.deliveryOnly) {
          return { ...this.applyDeliveryOverlay(base, override), allowedEvents };
        }
        // Личные флаги событий действуют только в пределах разрешённых роли событий.
        const events = Object.fromEntries(
          READER_NOTIFY_EVENT_KEYS.map((key) => [
            key,
            allowedEvents[key] === false
              ? false
              : ((override as Record<string, unknown>)[key] ?? true),
          ]),
        );
        return { ...override, role: null, ...events, allowedEvents };
      }
    }
    return { ...base, allowedEvents };
  }
}
