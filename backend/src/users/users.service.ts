import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { hashPassword, verifyPassword } from '../auth/password-crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const data = { ...createUserDto };
    if (data.password) {
      data.password = await hashPassword(data.password);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'employeeCode')) {
      const raw = data.employeeCode;
      data.employeeCode =
        raw === null || raw === undefined
          ? null
          : typeof raw === 'string'
            ? raw.trim() || null
            : null;
    }
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        employeeCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        employeeCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        role: true,
        isActive: true,
        isGuest: true,
        avatar: true,
        phone: true,
        employeeCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return this.prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
    });
  }

  /** Создать гостевого пользователя (для заказа от менеджера, до регистрации покупателя). */
  async createGuestUser(email: string, firstName?: string, lastName?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
    if (existing) {
      return existing; // Используем существующего пользователя (гость или зарегистрированный)
    }
    const randomPassword = await hashPassword(`guest_${Date.now()}_${Math.random().toString(36)}`);
    return this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: randomPassword,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        role: 'USER',
        isGuest: true,
      },
    });
  }

  /** Завершить регистрацию гостя: обновить пароль и isGuest. */
  async completeGuestRegistration(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user || !user.isGuest) {
      return null;
    }
    const hashedPassword = await hashPassword(password);
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isGuest: false,
        firstName: firstName?.trim() || user.firstName,
        lastName: lastName?.trim() || user.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto & { jobTitle?: string | null }) {
    await this.findOne(id);
    const data: Record<string, unknown> = { ...updateUserDto };
    if (data.password && typeof data.password === 'string') {
      data.password = await hashPassword(data.password);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'jobTitle')) {
      const raw = data.jobTitle;
      data.jobTitle =
        raw === null || raw === undefined
          ? null
          : typeof raw === 'string'
            ? raw.trim() || null
            : null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'employeeCode')) {
      const raw = data.employeeCode;
      data.employeeCode =
        raw === null || raw === undefined
          ? null
          : typeof raw === 'string'
            ? raw.trim() || null
            : null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'phone')) {
      const raw = data.phone;
      data.phone =
        raw === null || raw === undefined
          ? null
          : typeof raw === 'string'
            ? raw.trim() || null
            : null;
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        role: true,
        isActive: true,
        avatar: true,
        phone: true,
        employeeCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (data.password) {
      await this.prisma.userRefreshToken.deleteMany({ where: { userId: id } });
    }
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async getNotificationSettings(userId: string) {
    const settings = await this.prisma.userNotificationSettings.findUnique({
      where: { userId },
    });
    return (
      settings ?? {
        id: null,
        userId,
        notifyOnSupportChatReply: true,
        mobileCatalogColumns: null,
        createdAt: null,
        updatedAt: null,
      }
    );
  }

  async getAdminSidebarUiPrefs(userId: string): Promise<{
    hideIcons: boolean;
    mobileLayout: 'list' | 'grid3';
    desktopLayout: 'list' | 'grid2';
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        adminSidebarHideIcons: true,
        adminSidebarMobileLayout: true,
        adminSidebarDesktopLayout: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return {
      hideIcons: Boolean(user.adminSidebarHideIcons),
      mobileLayout: user.adminSidebarMobileLayout === 'grid3' ? 'grid3' : 'list',
      desktopLayout: user.adminSidebarDesktopLayout === 'grid2' ? 'grid2' : 'list',
    };
  }

  async updateAdminSidebarUiPrefs(
    userId: string,
    data: {
      hideIcons?: boolean;
      mobileLayout?: 'list' | 'grid3';
      desktopLayout?: 'list' | 'grid2';
    },
  ): Promise<{
    hideIcons: boolean;
    mobileLayout: 'list' | 'grid3';
    desktopLayout: 'list' | 'grid2';
  }> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.hideIcons !== undefined && { adminSidebarHideIcons: data.hideIcons }),
        ...(data.mobileLayout !== undefined && { adminSidebarMobileLayout: data.mobileLayout }),
        ...(data.desktopLayout !== undefined && {
          adminSidebarDesktopLayout: data.desktopLayout,
        }),
      },
      select: {
        adminSidebarHideIcons: true,
        adminSidebarMobileLayout: true,
        adminSidebarDesktopLayout: true,
      },
    });
    return {
      hideIcons: Boolean(updated.adminSidebarHideIcons),
      mobileLayout: updated.adminSidebarMobileLayout === 'grid3' ? 'grid3' : 'list',
      desktopLayout: updated.adminSidebarDesktopLayout === 'grid2' ? 'grid2' : 'list',
    };
  }

  async getNotificationHistory(userId: string, params?: { page?: number; limit?: number }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.userNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.userNotification.count({ where: { userId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createNotification(userId: string, data: { type: string; title: string; message: string }) {
    return this.prisma.userNotification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
      },
    });
  }

  async updateNotificationSettings(
    userId: string,
    data: { notifyOnSupportChatReply?: boolean; mobileCatalogColumns?: 1 | 2 | null },
  ) {
    return this.prisma.userNotificationSettings.upsert({
      where: { userId },
      update: {
        ...(data.notifyOnSupportChatReply !== undefined && {
          notifyOnSupportChatReply: data.notifyOnSupportChatReply,
        }),
        ...(data.mobileCatalogColumns !== undefined && {
          mobileCatalogColumns: data.mobileCatalogColumns,
        }),
      },
      create: {
        userId,
        notifyOnSupportChatReply: data.notifyOnSupportChatReply ?? true,
        mobileCatalogColumns: data.mobileCatalogColumns ?? undefined,
      },
    });
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    // Get user with password
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Текущий пароль неверен');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await this.prisma.userRefreshToken.deleteMany({ where: { userId: id } });

    return { message: 'Пароль успешно изменён' };
  }
}
