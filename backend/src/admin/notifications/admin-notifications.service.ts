import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { AdminNotificationSettingsReaderService } from '../../bell-push/admin-notification-settings-reader.service';
import { PrismaService } from '../../database/prisma.service';
import { UpdateAdminNotificationsDto } from './dto/update-admin-notifications.dto';

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
export class AdminNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsReader: AdminNotificationSettingsReaderService,
  ) {}

  getDefaultSettings() {
    return this.settingsReader.getDefaultSettings();
  }

  getSettingsForUser(userId: string | undefined, userRole: string | null) {
    return this.settingsReader.getSettingsForUser(userId, userRole);
  }

  async getSettingsByUser(userId: string) {
    const override = await this.prisma.userAdminNotificationOverride.findUnique({
      where: { userId },
    });
    if (override) {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      return { ...override, role: u?.role ?? null };
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const role = user?.role ?? null;
    const block = role
      ? ((await this.settingsReader.findBlockByRole(role)) ??
        (await this.settingsReader.findBlockByRole(null)))
      : await this.settingsReader.findBlockByRole(null);
    if (!block) return { ...this.getDefaultSettings(), userId, role };
    return { ...block, userId };
  }

  updateSettingsByUser(userId: string, dto: UpdateAdminNotificationsDto) {
    const data = {
      soundEnabled: dto.soundEnabled,
      soundVolume: dto.soundVolume,
      soundType: dto.soundType,
      customSoundUrl: dto.customSoundUrl,
      desktopNotifications: dto.desktopNotifications,
      checkIntervalSeconds: dto.checkIntervalSeconds,
      notifyOnReviews: dto.notifyOnReviews,
      notifyOnOrders: dto.notifyOnOrders,
      notifyOnSupportChat: dto.notifyOnSupportChat,
      notifyOnMeasurementForm: dto.notifyOnMeasurementForm,
      notifyOnCallbackForm: dto.notifyOnCallbackForm,
      notifyOnDirectorForm: dto.notifyOnDirectorForm,
      notifyOnQuoteForm: dto.notifyOnQuoteForm,
      notifyOnQuizMebel: dto.notifyOnQuizMebel,
      notifyOnQuizRemont: dto.notifyOnQuizRemont,
      notifyOnKnowledgeFeedback: dto.notifyOnKnowledgeFeedback,
      notifyOnSiteFeedback: dto.notifyOnSiteFeedback,
      notifyOnKnowledgeTraining: dto.notifyOnKnowledgeTraining,
      notifyOnWorkDays: dto.notifyOnWorkDays,
    };
    const updateData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    const createData = {
      userId,
      soundEnabled: dto.soundEnabled ?? true,
      soundVolume: dto.soundVolume ?? 70,
      soundType: dto.soundType ?? 'beep',
      customSoundUrl: dto.customSoundUrl ?? null,
      desktopNotifications: dto.desktopNotifications ?? false,
      checkIntervalSeconds: dto.checkIntervalSeconds ?? 60,
      notifyOnReviews: dto.notifyOnReviews ?? true,
      notifyOnOrders: dto.notifyOnOrders ?? true,
      notifyOnSupportChat: dto.notifyOnSupportChat ?? true,
      notifyOnMeasurementForm: dto.notifyOnMeasurementForm ?? true,
      notifyOnCallbackForm: dto.notifyOnCallbackForm ?? true,
      notifyOnDirectorForm: dto.notifyOnDirectorForm ?? true,
      notifyOnQuoteForm: dto.notifyOnQuoteForm ?? true,
      notifyOnQuizMebel: dto.notifyOnQuizMebel ?? true,
      notifyOnQuizRemont: dto.notifyOnQuizRemont ?? true,
      notifyOnKnowledgeFeedback: dto.notifyOnKnowledgeFeedback ?? true,
      notifyOnSiteFeedback: dto.notifyOnSiteFeedback ?? true,
      notifyOnKnowledgeTraining: dto.notifyOnKnowledgeTraining ?? true,
      notifyOnWorkDays: dto.notifyOnWorkDays ?? true,
    };
    return this.prisma.userAdminNotificationOverride.upsert({
      where: { userId },
      update: updateData,
      create: createData,
    });
  }

  getCustomers() {
    return this.prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: [{ email: 'asc' }],
    });
  }

  async updateAllCustomersNotificationSettings(notifyOnSupportChatReply?: boolean) {
    const users = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true },
    });
    const value = notifyOnSupportChatReply ?? true;
    const results = await Promise.all(
      users.map((u) =>
        this.prisma.userNotificationSettings.upsert({
          where: { userId: u.id },
          update: { notifyOnSupportChatReply: value },
          create: {
            userId: u.id,
            notifyOnSupportChatReply: value,
          },
        }),
      ),
    );
    return { updated: results.length };
  }

  async getCustomerNotificationSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, role: 'USER' },
    });
    if (!user) throw new BadRequestException('Пользователь не найден');
    const settings = await this.prisma.userNotificationSettings.findUnique({
      where: { userId },
    });
    return (
      settings ?? {
        id: null,
        userId,
        notifyOnSupportChatReply: true,
        createdAt: null,
        updatedAt: null,
      }
    );
  }

  async updateCustomerNotificationSettings(
    userId: string,
    body: { notifyOnSupportChatReply?: boolean },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, role: 'USER' },
    });
    if (!user) throw new BadRequestException('Пользователь не найден');
    return this.prisma.userNotificationSettings.upsert({
      where: { userId },
      update: { ...body },
      create: {
        userId,
        notifyOnSupportChatReply: body.notifyOnSupportChatReply ?? true,
      },
    });
  }

  getAdminUsers() {
    return this.prisma.user.findMany({
      where: { role: { in: ADMIN_ROLES } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
  }

  async getSettingsByRole(role?: string) {
    const roleValue = role === 'default' || role === '' || !role ? null : role;
    const block = await this.settingsReader.findBlockByRole(roleValue);
    if (!block) return { ...this.getDefaultSettings(), role: roleValue };
    return block;
  }

  getAllSettings() {
    return this.prisma.adminNotificationsBlock.findMany({
      orderBy: [{ role: 'asc' }],
    });
  }

  async updateSettings(dto: UpdateAdminNotificationsDto) {
    const role = dto.role === 'default' || dto.role === '' ? null : (dto.role ?? null);
    const data = {
      soundEnabled: dto.soundEnabled,
      soundVolume: dto.soundVolume,
      soundType: dto.soundType,
      customSoundUrl: dto.customSoundUrl,
      desktopNotifications: dto.desktopNotifications,
      checkIntervalSeconds: dto.checkIntervalSeconds,
      notifyOnReviews: dto.notifyOnReviews,
      notifyOnOrders: dto.notifyOnOrders,
      notifyOnSupportChat: dto.notifyOnSupportChat,
      notifyOnMeasurementForm: dto.notifyOnMeasurementForm,
      notifyOnCallbackForm: dto.notifyOnCallbackForm,
      notifyOnDirectorForm: dto.notifyOnDirectorForm,
      notifyOnQuoteForm: dto.notifyOnQuoteForm,
      notifyOnQuizMebel: dto.notifyOnQuizMebel,
      notifyOnQuizRemont: dto.notifyOnQuizRemont,
      notifyOnKnowledgeFeedback: dto.notifyOnKnowledgeFeedback,
      notifyOnSiteFeedback: dto.notifyOnSiteFeedback,
      notifyOnKnowledgeTraining: dto.notifyOnKnowledgeTraining,
      notifyOnWorkDays: dto.notifyOnWorkDays,
    };
    const updateData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    const createData = {
      role,
      soundEnabled: dto.soundEnabled ?? true,
      soundVolume: dto.soundVolume ?? 70,
      soundType: dto.soundType ?? 'beep',
      customSoundUrl: dto.customSoundUrl ?? null,
      desktopNotifications: dto.desktopNotifications ?? false,
      checkIntervalSeconds: dto.checkIntervalSeconds ?? 60,
      notifyOnReviews: dto.notifyOnReviews ?? true,
      notifyOnOrders: dto.notifyOnOrders ?? true,
      notifyOnSupportChat: dto.notifyOnSupportChat ?? true,
      notifyOnMeasurementForm: dto.notifyOnMeasurementForm ?? true,
      notifyOnCallbackForm: dto.notifyOnCallbackForm ?? true,
      notifyOnDirectorForm: dto.notifyOnDirectorForm ?? true,
      notifyOnQuoteForm: dto.notifyOnQuoteForm ?? true,
      notifyOnQuizMebel: dto.notifyOnQuizMebel ?? true,
      notifyOnQuizRemont: dto.notifyOnQuizRemont ?? true,
      notifyOnKnowledgeFeedback: dto.notifyOnKnowledgeFeedback ?? true,
      notifyOnSiteFeedback: dto.notifyOnSiteFeedback ?? true,
      notifyOnKnowledgeTraining: dto.notifyOnKnowledgeTraining ?? true,
      notifyOnWorkDays: dto.notifyOnWorkDays ?? true,
    };
    if (role !== null) {
      return this.prisma.adminNotificationsBlock.upsert({
        where: { role },
        update: updateData,
        create: createData,
      });
    }
    const existing = await this.prisma.adminNotificationsBlock.findFirst({
      where: { role: null },
    });
    if (existing) {
      return this.prisma.adminNotificationsBlock.update({
        where: { id: existing.id },
        data: updateData,
      });
    }
    return this.prisma.adminNotificationsBlock.create({
      data: createData,
    });
  }

  getSounds() {
    return this.prisma.notificationSound.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  createSound(name: string, fullUrl: string) {
    return this.prisma.notificationSound.create({
      data: {
        name,
        fileUrl: fullUrl,
      },
    });
  }

  async deleteSound(id: string) {
    const sound = await this.prisma.notificationSound.findUnique({
      where: { id },
    });
    if (!sound) {
      throw new BadRequestException('Звук не найден');
    }
    let relativePath = sound.fileUrl;
    try {
      const url = new URL(sound.fileUrl);
      relativePath = url.pathname;
    } catch {
      // fileUrl может быть относительным путём
    }
    const baseDir = path.resolve(process.cwd(), 'uploads');
    const resolvedPath = path.resolve(
      process.cwd(),
      relativePath.replace(/^\//, '').replace(/^\\/, ''),
    );
    if (
      (resolvedPath.startsWith(baseDir + path.sep) || resolvedPath === baseDir) &&
      !resolvedPath.includes('..')
    ) {
      try {
        fs.unlinkSync(resolvedPath);
      } catch {
        // Игнорируем ошибки удаления файла
      }
    }
    await this.prisma.notificationSound.delete({ where: { id } });
    return { success: true };
  }
}
