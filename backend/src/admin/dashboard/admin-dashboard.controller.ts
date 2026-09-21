import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Query,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { ADMIN_ROLES } from '../admin-access/admin-access.service';
import { KnowledgeTrainingAnalyticsService } from '../knowledge/knowledge-training-analytics.service';
import { AdminDashboardSettingsService } from './admin-dashboard-settings.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { UpdateAdminDashboardSettingsDto } from './dto/update-admin-dashboard-settings.dto';
import { UpdateAdminDashboardRoleBlockDto } from './dto/update-admin-dashboard-role-block.dto';
import { UpdateAdminDashboardRoleQuickLinksDto } from './dto/update-admin-dashboard-role-quick-links.dto';

@ApiTags('admin-dashboard')
@Controller('admin/dashboard')
@SkipThrottle()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(
    private readonly adminDashboardService: AdminDashboardService,
    private readonly adminDashboardSettingsService: AdminDashboardSettingsService,
    private readonly knowledgeTrainingAnalyticsService: KnowledgeTrainingAnalyticsService,
  ) {}

  @Get('settings')
  @ApiOperation({ summary: 'Настройки видимости блоков дашборда (с учётом ограничений роли)' })
  getSettings(@Req() req: RequestWithUser) {
    return this.adminDashboardSettingsService.getSettings(req.user?.role ?? null);
  }

  @Get('settings/role-blocks')
  @ApiOperation({ summary: 'Доступность блоков дашборда по ролям (только SUPER_ADMIN)' })
  getRoleBlocks(@Req() req: RequestWithUser) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Только суперадмин может настраивать блоки по ролям');
    }
    return this.adminDashboardSettingsService.getRoleBlocks();
  }

  @Patch('settings/role-blocks')
  @ApiOperation({ summary: 'Задать доступность блоков дашборда для роли (только SUPER_ADMIN)' })
  updateRoleBlock(@Req() req: RequestWithUser, @Body() dto: UpdateAdminDashboardRoleBlockDto) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Только суперадмин может настраивать блоки по ролям');
    }
    return this.adminDashboardSettingsService.updateRoleBlock(dto);
  }

  @Get('settings/role-quick-links')
  @ApiOperation({ summary: 'Доступность быстрых ссылок по ролям (только SUPER_ADMIN)' })
  getRoleQuickLinks(@Req() req: RequestWithUser) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Только суперадмин может настраивать ссылки по ролям');
    }
    return this.adminDashboardSettingsService.getRoleQuickLinks();
  }

  @Patch('settings/role-quick-links')
  @ApiOperation({
    summary: 'Задать доступность быстрых ссылок дашборда для роли (только SUPER_ADMIN)',
  })
  updateRoleQuickLinks(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateAdminDashboardRoleQuickLinksDto,
  ) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Только суперадмин может настраивать ссылки по ролям');
    }
    return this.adminDashboardSettingsService.updateRoleQuickLinks(dto);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки видимости блоков дашборда (только SUPER_ADMIN)' })
  updateSettings(@Req() req: RequestWithUser, @Body() dto: UpdateAdminDashboardSettingsDto) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Только суперадмин может изменять настройки дашборда');
    }
    return this.adminDashboardSettingsService.updateSettings(dto);
  }

  @Get('training-dynamics')
  @ApiOperation({
    summary:
      'Динамика прохождения обучения сотрудниками (без стажёров) — общий график для дашборда',
  })
  async getTrainingDynamics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Req() req?: RequestWithUser,
  ) {
    if (req?.user.role === 'TRAINEE') {
      throw new ForbiddenException('Недостаточно прав');
    }
    return this.knowledgeTrainingAnalyticsService.getDashboardTrainingDynamics({
      dateFrom,
      dateTo,
    });
  }

  @Get('catalog-activity')
  @ApiOperation({
    summary:
      'Статистика: сколько товаров и категорий создал каждый админ за период и всего за всё время',
  })
  async getCatalogActivity(@Query('from') fromStr?: string, @Query('to') toStr?: string) {
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr ? new Date(fromStr) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Некорректная дата');
    }
    if (from > to) {
      throw new BadRequestException('Дата «с» должна быть не позже даты «по»');
    }
    return this.adminDashboardService.getCatalogActivity(from, to);
  }

  /** Продажи за текущий месяц: итог, направления и менеджеры (по журналу ДП). */
  @Get('sales-month')
  @ApiOperation({
    summary: 'Продажи за текущий месяц: итог, по направлениям и по менеджерам (журнал ДП)',
  })
  getSalesMonth() {
    return this.adminDashboardService.getSalesMonth();
  }
}
