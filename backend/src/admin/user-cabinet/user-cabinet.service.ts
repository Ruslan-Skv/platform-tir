import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateUserCabinetDto } from './dto/update-user-cabinet.dto';

const DEFAULT_USER_CABINET_SETTINGS = {
  showProfileSection: true,
  showOrdersSection: true,
  showNotificationsSection: true,
  showNotificationHistory: true,
  showPasswordSection: true,
  showQuickLinks: true,
};

@Injectable()
export class UserCabinetService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminSettings() {
    const block = await this.prisma.userCabinetBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return this.prisma.userCabinetBlock.create({
        data: {
          id: 'main',
          ...DEFAULT_USER_CABINET_SETTINGS,
        },
      });
    }
    return block;
  }

  getPublicSettings() {
    return this.getPublicSettingsInternal();
  }

  private async getPublicSettingsInternal() {
    const block = await this.prisma.userCabinetBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return DEFAULT_USER_CABINET_SETTINGS;
    }
    return block;
  }

  async getUserCabinet(userId: string) {
    const [user, orders, notifSettings, notifications] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: { userId, deletedAt: null },
        include: {
          items: { include: { product: { select: { id: true, name: true, slug: true } } } },
          shippingAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.userNotificationSettings.findUnique({
        where: { userId },
      }),
      this.prisma.userNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return {
      user,
      orders,
      notificationSettings: notifSettings ?? { notifyOnSupportChatReply: true },
      notifications,
    };
  }

  updateSettings(dto: UpdateUserCabinetDto) {
    return this.prisma.userCabinetBlock.upsert({
      where: { id: 'main' },
      update: {
        ...(dto.showProfileSection !== undefined && { showProfileSection: dto.showProfileSection }),
        ...(dto.showOrdersSection !== undefined && { showOrdersSection: dto.showOrdersSection }),
        ...(dto.showNotificationsSection !== undefined && {
          showNotificationsSection: dto.showNotificationsSection,
        }),
        ...(dto.showNotificationHistory !== undefined && {
          showNotificationHistory: dto.showNotificationHistory,
        }),
        ...(dto.showPasswordSection !== undefined && {
          showPasswordSection: dto.showPasswordSection,
        }),
        ...(dto.showQuickLinks !== undefined && { showQuickLinks: dto.showQuickLinks }),
        ...(dto.privacyPolicyUrl !== undefined && {
          privacyPolicyUrl: dto.privacyPolicyUrl?.trim() || null,
        }),
        ...(dto.privacyPolicyTitle !== undefined && {
          privacyPolicyTitle: dto.privacyPolicyTitle?.trim() || null,
        }),
        ...(dto.privacyPolicyContent !== undefined && {
          privacyPolicyContent: dto.privacyPolicyContent?.trim() || null,
        }),
        ...(dto.consentText !== undefined && { consentText: dto.consentText?.trim() || null }),
        ...(dto.consentLinkText !== undefined && {
          consentLinkText: dto.consentLinkText?.trim() || null,
        }),
      },
      create: {
        id: 'main',
        showProfileSection: dto.showProfileSection ?? true,
        showOrdersSection: dto.showOrdersSection ?? true,
        showNotificationsSection: dto.showNotificationsSection ?? true,
        showNotificationHistory: dto.showNotificationHistory ?? true,
        showPasswordSection: dto.showPasswordSection ?? true,
        showQuickLinks: dto.showQuickLinks ?? true,
        privacyPolicyUrl: dto.privacyPolicyUrl?.trim() || null,
        privacyPolicyTitle: dto.privacyPolicyTitle?.trim() || null,
        privacyPolicyContent: dto.privacyPolicyContent?.trim() || null,
        consentText: dto.consentText?.trim() || null,
        consentLinkText: dto.consentLinkText?.trim() || null,
      },
    });
  }
}
