import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Query,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import type { Request } from 'express';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';
import { UpdateAdminNotificationsDto } from './dto/update-admin-notifications.dto';

/** Prisma findUnique/upsert не принимают role: null — используем findFirst для default. */
async function findBlockByRole(prisma: PrismaService, role: string | null) {
  if (role !== null) {
    return prisma.adminNotificationsBlock.findUnique({
      where: { role },
    });
  }
  return prisma.adminNotificationsBlock.findFirst({
    where: { role: null },
  });
}

const soundsDir = path.join(process.cwd(), 'uploads', 'notification-sounds');

const soundStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true });
    cb(null, soundsDir);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || '.mp3';
    cb(null, `sound-${Date.now()}${ext}`);
  },
});

@ApiTags('admin/notifications')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminNotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  private getDefaultSettings() {
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
    };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Получить настройки уведомлений для текущего пользователя' })
  async getSettings(@Req() req: RequestWithUser) {
    const userId = req.user?.id;
    const userRole = req.user?.role ?? null;
    if (userId) {
      const override = await this.prisma.userAdminNotificationOverride.findUnique({
        where: { userId },
      });
      if (override) {
        return { ...override, role: null };
      }
    }
    const block = userRole
      ? ((await findBlockByRole(this.prisma, userRole)) ??
        (await findBlockByRole(this.prisma, null)))
      : await findBlockByRole(this.prisma, null);
    if (!block) return this.getDefaultSettings();
    return block;
  }

  @Get('settings/by-user/:userId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Получить настройки для пользователя (только супер-админ)' })
  async getSettingsByUser(@Req() req: RequestWithUser, @Param('userId') userId: string) {
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
      ? ((await findBlockByRole(this.prisma, role)) ?? (await findBlockByRole(this.prisma, null)))
      : await findBlockByRole(this.prisma, null);
    if (!block) return { ...this.getDefaultSettings(), userId, role };
    return { ...block, userId };
  }

  @Patch('settings/by-user/:userId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Обновить настройки для пользователя (только супер-админ)' })
  async updateSettingsByUser(
    @Req() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateAdminNotificationsDto,
  ) {
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
    };
    return this.prisma.userAdminNotificationOverride.upsert({
      where: { userId },
      update: updateData,
      create: createData,
    });
  }

  @Get('customers')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Список покупателей (USER) для настройки уведомлений' })
  async getCustomers() {
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

  @Patch('customers/bulk')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Обновить настройки уведомлений для всех покупателей (USER)' })
  async updateAllCustomersNotificationSettings(
    @Body() body: { notifyOnSupportChatReply?: boolean },
  ) {
    const users = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true },
    });
    const value = body.notifyOnSupportChatReply ?? true;
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

  @Get('customers/:userId/settings')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Настройки уведомлений покупателя (чат поддержки)' })
  async getCustomerNotificationSettings(@Param('userId') userId: string) {
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

  @Patch('customers/:userId/settings')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Обновить настройки уведомлений покупателя' })
  async updateCustomerNotificationSettings(
    @Param('userId') userId: string,
    @Body() body: { notifyOnSupportChatReply?: boolean },
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

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Список пользователей админки для выбора (только супер-админ)' })
  async getAdminUsers() {
    const ADMIN_ROLES: UserRole[] = [
      'SUPER_ADMIN',
      'ADMIN',
      'CONTENT_MANAGER',
      'MODERATOR',
      'SUPPORT',
      'PARTNER',
      'BRIGADIER',
      'LEAD_SPECIALIST_FURNITURE',
      'LEAD_SPECIALIST_WINDOWS_DOORS',
      'SURVEYOR',
      'DRIVER',
      'INSTALLER',
    ];
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

  @Get('settings/by-role')
  @ApiOperation({ summary: 'Получить настройки для конкретной роли (для страницы настроек)' })
  async getSettingsByRole(@Req() req: RequestWithUser, @Query('role') role?: string) {
    const roleValue = role === 'default' || role === '' || !role ? null : role;
    const block = await findBlockByRole(this.prisma, roleValue);
    if (!block) return { ...this.getDefaultSettings(), role: roleValue };
    return block;
  }

  @Get('settings/all')
  @ApiOperation({ summary: 'Список всех профилей настроек по ролям' })
  async getAllSettings() {
    const blocks = await this.prisma.adminNotificationsBlock.findMany({
      orderBy: [{ role: 'asc' }],
    });
    return blocks;
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки уведомлений' })
  async updateSettings(@Body() dto: UpdateAdminNotificationsDto) {
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

  @Get('sounds')
  @ApiOperation({ summary: 'Список загруженных звуков' })
  async getSounds() {
    return this.prisma.notificationSound.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('sounds')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: soundStorage,
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.originalname);
        if (!allowed) {
          cb(
            new BadRequestException('Допустимы только аудиофайлы: mp3, wav, ogg, m4a, aac'),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string', description: 'Название звука' },
      },
    },
  })
  @ApiOperation({ summary: 'Загрузить новый звук' })
  async uploadSound(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Body('name') name?: string,
  ) {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const filename = path.basename(file.path);
    const fileUrl = `/uploads/notification-sounds/${filename}`;
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const prefix = baseUrl.replace(/\/$/, '');
    const fullUrl = `${prefix}${fileUrl}`;

    const sound = await this.prisma.notificationSound.create({
      data: {
        name: name || file.originalname || 'Звук',
        fileUrl: fullUrl,
      },
    });
    return sound;
  }

  @Delete('sounds/:id')
  @ApiOperation({ summary: 'Удалить звук' })
  async deleteSound(@Param('id') id: string) {
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
    const filePath = path.join(process.cwd(), relativePath.replace(/^\//, ''));
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith(path.join(process.cwd(), 'uploads'))) {
      try {
        fs.unlinkSync(normalizedPath);
      } catch {
        // Игнорируем ошибки удаления файла
      }
    }
    await this.prisma.notificationSound.delete({ where: { id } });
    return { success: true };
  }
}
