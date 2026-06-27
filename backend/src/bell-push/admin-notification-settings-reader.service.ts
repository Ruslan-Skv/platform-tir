import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

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
      customSoundUrl: null,
      desktopNotifications: false,
      checkIntervalSeconds: 60,
      notifyOnReviews: true,
      notifyOnOrders: true,
      notifyOnSupportChat: true,
      notifyOnMeasurementForm: true,
      notifyOnCallbackForm: true,
      notifyOnKnowledgeFeedback: true,
      notifyOnSiteFeedback: true,
    };
  }

  async getSettingsForUser(userId: string | undefined, userRole: string | null) {
    if (userId) {
      const override = await this.prisma.userAdminNotificationOverride.findUnique({
        where: { userId },
      });
      if (override) {
        return { ...override, role: null };
      }
    }
    const block = userRole
      ? ((await this.findBlockByRole(userRole)) ?? (await this.findBlockByRole(null)))
      : await this.findBlockByRole(null);
    if (!block) return this.getDefaultSettings();
    return block;
  }
}
