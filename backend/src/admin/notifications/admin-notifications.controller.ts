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
import { UpdateAdminNotificationsDto } from './dto/update-admin-notifications.dto';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';
import { AdminNotificationsService } from './admin-notifications.service';

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
  constructor(private readonly notifications: AdminNotificationsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Получить настройки уведомлений для текущего пользователя' })
  getSettings(@Req() req: RequestWithUser) {
    return this.notifications.getSettingsForUser(req.user?.id, req.user?.role ?? null);
  }

  @Get('settings/by-user/:userId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Получить настройки для пользователя (только супер-админ)' })
  getSettingsByUser(@Param('userId') userId: string) {
    return this.notifications.getSettingsByUser(userId);
  }

  @Patch('settings/by-user/:userId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Обновить настройки для пользователя (только супер-админ)' })
  updateSettingsByUser(@Param('userId') userId: string, @Body() dto: UpdateAdminNotificationsDto) {
    return this.notifications.updateSettingsByUser(userId, dto);
  }

  @Get('customers')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Список покупателей (USER) для настройки уведомлений' })
  getCustomers() {
    return this.notifications.getCustomers();
  }

  @Patch('customers/bulk')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Обновить настройки уведомлений для всех покупателей (USER)' })
  updateAllCustomersNotificationSettings(@Body() body: { notifyOnSupportChatReply?: boolean }) {
    return this.notifications.updateAllCustomersNotificationSettings(body.notifyOnSupportChatReply);
  }

  @Get('customers/:userId/settings')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Настройки уведомлений покупателя (чат поддержки)' })
  getCustomerNotificationSettings(@Param('userId') userId: string) {
    return this.notifications.getCustomerNotificationSettings(userId);
  }

  @Patch('customers/:userId/settings')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Обновить настройки уведомлений покупателя' })
  updateCustomerNotificationSettings(
    @Param('userId') userId: string,
    @Body() body: { notifyOnSupportChatReply?: boolean },
  ) {
    return this.notifications.updateCustomerNotificationSettings(userId, body);
  }

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Список пользователей админки для выбора (только супер-админ)' })
  getAdminUsers() {
    return this.notifications.getAdminUsers();
  }

  @Get('settings/by-role')
  @ApiOperation({ summary: 'Получить настройки для конкретной роли (для страницы настроек)' })
  getSettingsByRole(@Query('role') role?: string) {
    return this.notifications.getSettingsByRole(role);
  }

  @Get('settings/all')
  @ApiOperation({ summary: 'Список всех профилей настроек по ролям' })
  getAllSettings() {
    return this.notifications.getAllSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки уведомлений' })
  updateSettings(@Body() dto: UpdateAdminNotificationsDto) {
    return this.notifications.updateSettings(dto);
  }

  @Get('sounds')
  @ApiOperation({ summary: 'Список загруженных звуков' })
  getSounds() {
    return this.notifications.getSounds();
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
    const prefix = uploadsBaseUrl(baseUrl);
    const fullUrl = `${prefix}${fileUrl}`;

    return this.notifications.createSound(name || file.originalname || 'Звук', fullUrl);
  }

  @Delete('sounds/:id')
  @ApiOperation({ summary: 'Удалить звук' })
  deleteSound(@Param('id') id: string) {
    return this.notifications.deleteSound(id);
  }
}
