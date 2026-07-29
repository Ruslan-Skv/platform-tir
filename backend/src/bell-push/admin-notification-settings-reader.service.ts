import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

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

  async getSettingsForUser(userId: string | undefined, userRole: string | null) {
    if (userId) {
      const override = await this.prisma.userAdminNotificationOverride.findUnique({
        where: { userId },
      });
      if (override) {
        if (override.deliveryOnly) {
          const base = await this.resolveRoleBase(userRole);
          return this.applyDeliveryOverlay(base, override);
        }
        return { ...override, role: null };
      }
    }
    return this.resolveRoleBase(userRole);
  }
}
