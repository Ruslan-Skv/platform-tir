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
import { SkipThrottle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import type { Request } from 'express';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminPushSubscribeDto } from '../../bell-push/dto/admin-push-subscribe.dto';
import { AdminPushSubscriptionsService } from '../../bell-push/admin-push-subscriptions.service';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';
import { UpdateAdminNotificationsDto } from './dto/update-admin-notifications.dto';
import { UpdateMyAdminNotificationDeliveryDto } from './dto/update-my-admin-notification-delivery.dto';
import { UpdateExternalNotifySettingsDto } from '../external-notify/dto/update-external-notify-settings.dto';
import { AdminExternalNotifyService } from '../external-notify/admin-external-notify.service';
import { AdminBellDismissedService } from './admin-bell-dismissed.service';
import { AdminBellHistoryService } from './services/admin-bell-history.service';
import { AdminBellTrainingFeedService } from './admin-bell-training-feed.service';
import { AdminBellWorkDayFeedService } from './admin-bell-work-day-feed.service';
import { AdminBellWaybillFeedService } from './admin-bell-waybill-feed.service';
import { AdminBellInstallationScheduleFeedService } from './admin-bell-installation-schedule-feed.service';
import { AdminBellRepairScheduleFeedService } from './admin-bell-repair-schedule-feed.service';
import { AdminBellFurnitureScheduleFeedService } from './admin-bell-furniture-schedule-feed.service';
import { AdminBellMeasurementFeedService } from './services/admin-bell-measurement-feed.service';
import { AdminBellIncassationFeedService } from './services/admin-bell-incassation-feed.service';
import { AdminBellCalendarFeedService } from './admin-bell-calendar-feed.service';
import { AdminBellMessengerFeedService } from './admin-bell-messenger-feed.service';
import { AdminBellKanbanFeedService } from './admin-bell-kanban-feed.service';
import { AdminBellContractSigningFeedService } from './services/admin-bell-contract-signing-feed.service';
import { AdminNotificationsService } from './admin-notifications.service';
import { DismissAdminBellNotificationsDto } from './dto/dismiss-admin-bell-notifications.dto';
import { SaveAdminBellNotificationHistoryDto } from './dto/save-admin-bell-notification-history.dto';

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
  constructor(
    private readonly notifications: AdminNotificationsService,
    private readonly pushSubscriptions: AdminPushSubscriptionsService,
    private readonly externalNotifySettings: AdminExternalNotifyService,
    private readonly bellDismissed: AdminBellDismissedService,
    private readonly bellHistory: AdminBellHistoryService,
    private readonly bellTrainingFeed: AdminBellTrainingFeedService,
    private readonly bellWorkDayFeed: AdminBellWorkDayFeedService,
    private readonly bellWaybillFeed: AdminBellWaybillFeedService,
    private readonly bellInstallationScheduleFeed: AdminBellInstallationScheduleFeedService,
    private readonly bellRepairScheduleFeed: AdminBellRepairScheduleFeedService,
    private readonly bellFurnitureScheduleFeed: AdminBellFurnitureScheduleFeedService,
    private readonly bellMeasurementFeed: AdminBellMeasurementFeedService,
    private readonly bellIncassationFeed: AdminBellIncassationFeedService,
    private readonly bellCalendarFeed: AdminBellCalendarFeedService,
    private readonly bellMessengerFeed: AdminBellMessengerFeedService,
    private readonly bellKanbanFeed: AdminBellKanbanFeedService,
    private readonly bellContractSigningFeed: AdminBellContractSigningFeedService,
  ) {}

  @Get('push/vapid-public-key')
  @ApiOperation({ summary: 'Публичный VAPID-ключ для Web Push (PWA)' })
  getPushVapidPublicKey() {
    return { publicKey: this.pushSubscriptions.getPublicKey() };
  }

  @Post('push/subscribe')
  @ApiOperation({ summary: 'Подписаться на push-уведомления админки (PWA)' })
  subscribePush(@Req() req: RequestWithUser, @Body() dto: AdminPushSubscribeDto) {
    const userAgent = req.headers['user-agent'];
    return this.pushSubscriptions.upsertSubscription(
      req.user.id,
      dto,
      typeof userAgent === 'string' ? userAgent : undefined,
    );
  }

  @Delete('push/subscribe')
  @ApiOperation({ summary: 'Отписаться от push-уведомлений админки' })
  unsubscribePush(@Req() req: RequestWithUser, @Body() dto: AdminPushSubscribeDto) {
    return this.pushSubscriptions.removeSubscription(req.user.id, dto.endpoint);
  }

  @SkipThrottle()
  @Get('settings')
  @ApiOperation({ summary: 'Получить настройки уведомлений для текущего пользователя' })
  getSettings(@Req() req: RequestWithUser) {
    return this.notifications.getSettingsForUser(req.user?.id, req.user?.role ?? null);
  }

  @Patch('settings/me')
  @ApiOperation({
    summary: 'Личные настройки уведомлений: доставка и опциональные переопределения событий',
  })
  updateMyDeliveryPrefs(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateMyAdminNotificationDeliveryDto,
  ) {
    return this.notifications.updateMyDeliveryPrefs(req.user.id, req.user?.role ?? null, dto);
  }

  @Delete('settings/me')
  @ApiOperation({ summary: 'Сбросить личные настройки уведомлений к настройкам роли' })
  resetMySettings(@Req() req: RequestWithUser) {
    return this.notifications.resetMySettings(req.user.id, req.user?.role ?? null);
  }

  @SkipThrottle()
  @Get('bell/dismissed')
  @ApiOperation({ summary: 'Ключи уведомлений колокольчика, отмеченных прочитанными' })
  getBellDismissed(@Req() req: RequestWithUser) {
    return this.bellDismissed.listKeys(req.user.id).then((keys) => ({ keys }));
  }

  @Post('bell/dismissed')
  @ApiOperation({ summary: 'Отметить уведомления колокольчика прочитанными' })
  dismissBellNotifications(
    @Req() req: RequestWithUser,
    @Body() dto: DismissAdminBellNotificationsDto,
  ) {
    return this.bellDismissed.dismiss(req.user.id, dto.keys);
  }

  @SkipThrottle()
  @Get('bell/history')
  @ApiOperation({ summary: 'История прочитанных уведомлений колокольчика (лично)' })
  getBellHistory(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(200, Math.max(1, limit ? parseInt(limit, 10) : 50));
    return this.bellHistory.listForUser(req.user.id, take);
  }

  @Post('bell/history')
  @ApiOperation({ summary: 'Сохранить уведомления в историю при отметке прочитанными' })
  saveBellHistory(@Req() req: RequestWithUser, @Body() dto: SaveAdminBellNotificationHistoryDto) {
    return this.bellHistory.saveMany(req.user.id, dto.items);
  }

  @SkipThrottle()
  @Get('bell/training')
  @ApiOperation({ summary: 'События динамики обучения для колокольчика админки' })
  getBellTrainingFeed(@Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellTrainingFeed.listRecent(take);
  }

  @SkipThrottle()
  @Get('bell/work-days')
  @ApiOperation({ summary: 'События учёта рабочего времени для колокольчика админки' })
  getBellWorkDayFeed(@Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellWorkDayFeed.listRecent(take);
  }

  @SkipThrottle()
  @Get('bell/work-days/my-request-reviews')
  @ApiOperation({
    summary: 'Ответы на мои запросы (выходной / пораньше / попозже) для колокольчика (лично)',
  })
  getBellMyWorkDayRequestReviews(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellWorkDayFeed.listReviewedRequestsForUser(req.user.id, take);
  }

  @SkipThrottle()
  @Get('bell/waybills')
  @ApiOperation({ summary: 'События путевого листа для колокольчика (персонально)' })
  getBellWaybillFeed(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellWaybillFeed.listForUser(req.user.id, take);
  }

  @SkipThrottle()
  @Get('bell/installation-schedules')
  @ApiOperation({ summary: 'События графика монтажей для колокольчика (персонально)' })
  getBellInstallationScheduleFeed(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellInstallationScheduleFeed.listForUser(req.user.id, take);
  }

  @SkipThrottle()
  @Get('bell/repair-schedules')
  @ApiOperation({ summary: 'События графика ремонтов для колокольчика (персонально)' })
  getBellRepairScheduleFeed(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellRepairScheduleFeed.listForUser(req.user.id, take);
  }

  @SkipThrottle()
  @Get('bell/furniture-schedules')
  @ApiOperation({ summary: 'События графика мебели для колокольчика (персонально)' })
  getBellFurnitureScheduleFeed(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellFurnitureScheduleFeed.listForUser(req.user.id, take);
  }

  @SkipThrottle()
  @Get('bell/measurements')
  @ApiOperation({ summary: 'События изменения статусов замеров для колокольчика (персонально)' })
  getBellMeasurementFeed(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellMeasurementFeed.listForUser(req.user.id, take);
  }

  @SkipThrottle()
  @Get('bell/incassations')
  @ApiOperation({ summary: 'События инкассаций наличных для колокольчика (персонально)' })
  getBellIncassationFeed(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellIncassationFeed.listForUser(req.user.id, take);
  }

  @SkipThrottle()
  @Get('bell/calendar')
  @ApiOperation({ summary: 'События календаря для колокольчика (персонально)' })
  getBellCalendarFeed(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellCalendarFeed.listForUser(req.user.id, take);
  }

  @SkipThrottle()
  @Get('bell/messenger')
  @ApiOperation({ summary: 'Сообщения мессенджера для колокольчика (персонально)' })
  getBellMessengerFeed(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellMessengerFeed.listForUser(req.user.id, take);
  }

  @SkipThrottle()
  @Get('bell/kanban')
  @ApiOperation({ summary: 'События канбана для колокольчика (персонально)' })
  getBellKanbanFeed(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellKanbanFeed.listForUser(req.user.id, take);
  }

  @SkipThrottle()
  @Get('bell/contract-signing')
  @ApiOperation({ summary: 'События электронного подписания договоров для колокольчика (лично)' })
  getBellContractSigningFeed(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.bellContractSigningFeed.listForUser(req.user.id, take);
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
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Получить настройки для конкретной роли (для страницы настроек)' })
  getSettingsByRole(@Query('role') role?: string) {
    return this.notifications.getSettingsByRole(role);
  }

  @Get('settings/all')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Список всех профилей настроек по ролям' })
  getAllSettings() {
    return this.notifications.getAllSettings();
  }

  @Patch('settings')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Обновить настройки уведомлений по роли' })
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

  @Get('external-channels')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Каналы внешних уведомлений (email, Telegram, MAX)' })
  getExternalChannels() {
    return this.externalNotifySettings.getSettings();
  }

  @Patch('external-channels')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Обновить каналы внешних уведомлений' })
  updateExternalChannels(@Body() dto: UpdateExternalNotifySettingsDto) {
    return this.externalNotifySettings.updateSettings(dto);
  }
}
