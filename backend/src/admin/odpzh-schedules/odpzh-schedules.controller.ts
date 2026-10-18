import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import {
  ODPZH_SCHEDULE_KINDS,
  type OdpzhScheduleKind,
  type OdpzhScheduleStatus,
  isOdpzhScheduleStatus,
} from './odpzh-schedule.shared';
import { OdpzhSchedulesService } from './odpzh-schedules.service';

/** Роли — как у план-графика ремонта. */
const SCHEDULE_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'INSTALLER',
] as const;

@Controller('admin/odpzh-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SCHEDULE_ROLES)
export class OdpzhSchedulesController {
  constructor(private readonly service: OdpzhSchedulesService) {}

  @Get()
  findAll(
    @Req() _req: RequestWithUser,
    @Query('status') status?: string,
    @Query('direction') direction?: string,
    @Query('search') search?: string,
  ) {
    if (status !== undefined && status !== 'ALL' && !isOdpzhScheduleStatus(status)) {
      throw new BadRequestException(`Неизвестный статус: ${status}`);
    }
    if (
      direction !== undefined &&
      !(ODPZH_SCHEDULE_KINDS as readonly string[]).includes(direction)
    ) {
      throw new BadRequestException(`Неизвестное направление: ${direction}`);
    }
    // 'ALL' или отсутствие статуса — все договоры (с учётом направления/поиска).
    const statusFilter = status === 'ALL' ? undefined : (status as OdpzhScheduleStatus | undefined);
    const directionFilter = direction as OdpzhScheduleKind | undefined;
    return this.service.findAll({
      status: statusFilter,
      direction: directionFilter,
      search,
    });
  }
}
