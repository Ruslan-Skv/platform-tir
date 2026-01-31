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
import { PrismaService } from '../../database/prisma.service';
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
    const userRole = req.user?.role ?? null;
    const block = userRole
      ? ((await findBlockByRole(this.prisma, userRole)) ??
        (await findBlockByRole(this.prisma, null)))
      : await findBlockByRole(this.prisma, null);
    if (!block) return this.getDefaultSettings();
    return block;
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
