import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { Roles } from '../../common/decorators/roles.decorator';

import { RolesGuard } from '../../common/guards/roles.guard';

import type { RequestWithUser } from '../../common/types/request-with-user.types';

import { CompleteInstallationScheduleDto } from './dto/complete-installation-schedule.dto';

import { CreateInstallationScheduleDto } from './dto/create-installation-schedule.dto';

import { FailInstallationScheduleDto } from './dto/fail-installation-schedule.dto';

import { RescheduleInstallationScheduleDto } from './dto/reschedule-installation-schedule.dto';

import { UpdateInstallationScheduleDto } from './dto/update-installation-schedule.dto';

import { InstallationSchedulesService } from './installation-schedules.service';

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

const PLANNER_ROLES = [
  'SUPER_ADMIN',

  'ADMIN',

  'MODERATOR',

  'SUPPORT',

  'MANAGER',

  'TECHNOLOGIST',

  'BRIGADIER',

  'LEAD_SPECIALIST_FURNITURE',

  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

@Controller('admin/installation-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SCHEDULE_ROLES)
export class InstallationSchedulesController {
  constructor(private readonly service: InstallationSchedulesService) {}

  private assertPlanner(role: string) {
    if (!(PLANNER_ROLES as readonly string[]).includes(role)) {
      throw new ForbiddenException('Недостаточно прав');
    }
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateInstallationScheduleDto) {
    this.assertPlanner(req.user.role);

    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(
    @Req() req: RequestWithUser,

    @Query('date') date?: string,

    @Query('dateFrom') dateFrom?: string,

    @Query('dateTo') dateTo?: string,

    @Query('direction') direction?: string,

    @Query('installerId') installerId?: string,
  ) {
    this.assertPlanner(req.user.role);

    if (dateFrom?.trim() || dateTo?.trim()) {
      return this.service.findByDateRange({ dateFrom, dateTo, direction, installerId });
    }

    if (date?.trim()) {
      return this.service.findByDateRange({
        dateFrom: date,

        dateTo: date,

        direction,

        installerId,
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    return this.service.findByDateRange({
      dateFrom: today,

      dateTo: today,

      direction,

      installerId,
    });
  }

  @Get('my')
  findMy(
    @Req() req: RequestWithUser,

    @Query('date') date?: string,

    @Query('dateFrom') dateFrom?: string,

    @Query('dateTo') dateTo?: string,
  ) {
    if (dateFrom?.trim() || dateTo?.trim()) {
      return this.service.findMyByDateRange(req.user.id, { dateFrom, dateTo });
    }

    return this.service.findMyByDate(req.user.id, date);
  }

  @Get('work-orders')
  listWorkOrders(
    @Req() req: RequestWithUser,

    @Query('packageId') packageId?: string,

    @Query('installerId') installerId?: string,
  ) {
    this.assertPlanner(req.user.role);

    if (!packageId?.trim()) {
      throw new BadRequestException('packageId is required');
    }

    return this.service.listPackageWorkOrders({ packageId, installerId });
  }

  @Get('trash/count')
  trashCount(@Req() req: RequestWithUser) {
    this.assertPlanner(req.user.role);

    return this.service.trashCount().then((count) => ({ count }));
  }

  @Get('trash')
  findTrash(
    @Req() req: RequestWithUser,

    @Query('search') search?: string,

    @Query('page') page?: string,

    @Query('limit') limit?: string,
  ) {
    this.assertPlanner(req.user.role);

    return this.service.findTrash({
      search,

      page: page ? Number(page) : undefined,

      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Req() req: RequestWithUser,

    @Param('id') id: string,

    @Body() dto: UpdateInstallationScheduleDto,
  ) {
    this.assertPlanner(req.user.role);

    return this.service.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.assertPlanner(req.user.role);

    return this.service.remove(id, req.user.id, req.user.role);
  }

  @Post(':id/restore')
  restore(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.assertPlanner(req.user.role);

    return this.service.restore(id);
  }

  @Post(':id/complete')
  complete(
    @Req() req: RequestWithUser,

    @Param('id') id: string,

    @Body() dto: CompleteInstallationScheduleDto,
  ) {
    return this.service.complete(id, dto, req.user.id, req.user.role);
  }

  @Post(':id/fail')
  fail(
    @Req() req: RequestWithUser,

    @Param('id') id: string,

    @Body() dto: FailInstallationScheduleDto,
  ) {
    return this.service.fail(id, dto, req.user.id, req.user.role);
  }

  @Post(':id/reschedule')
  reschedule(
    @Req() req: RequestWithUser,

    @Param('id') id: string,

    @Body() dto: RescheduleInstallationScheduleDto,
  ) {
    this.assertPlanner(req.user.role);

    return this.service.reschedule(id, dto, req.user.id);
  }

  @Post(':id/reopen')
  reopen(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.assertPlanner(req.user.role);

    return this.service.reopen(id);
  }
}
