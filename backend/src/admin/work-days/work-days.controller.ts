import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import { RequestWithUser } from '../../common/types/request-with-user.types';
import {
  CloseForgottenWorkDayDto,
  StartAbsenceDto,
  StartWorkDayDto,
  UpdateOfficeWorkScheduleDto,
  UpdateUserWorkScheduleDto,
  UpdateWorkDaySettingsDto,
} from './dto/work-day.dto';
import { WorkDaysService } from './work-days.service';

function extractMeta(req: Request) {
  return {
    userAgent: req.headers['user-agent'],
    forwardedFor: req.headers['x-forwarded-for'],
    realIp: req.headers['x-real-ip'] as string | undefined,
    remoteAddress: req.socket?.remoteAddress,
  };
}

@Controller('admin/work-days')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
export class WorkDaysController {
  constructor(private readonly workDaysService: WorkDaysService) {}

  @Get('settings')
  @Roles(UserRole.SUPER_ADMIN)
  getSettings() {
    return this.workDaysService.getSettings();
  }

  @Patch('settings')
  @Roles(UserRole.SUPER_ADMIN)
  updateSettings(@Body() dto: UpdateWorkDaySettingsDto) {
    return this.workDaysService.updateSettings(dto);
  }

  @Get('offices')
  @Roles(UserRole.SUPER_ADMIN)
  listOffices() {
    return this.workDaysService.listOfficesWithSchedule();
  }

  @Patch('offices/:officeId')
  @Roles(UserRole.SUPER_ADMIN)
  updateOffice(@Param('officeId') officeId: string, @Body() dto: UpdateOfficeWorkScheduleDto) {
    return this.workDaysService.updateOfficeWorkSchedule(officeId, dto);
  }

  @Get('users')
  @Roles(UserRole.SUPER_ADMIN)
  listUsers() {
    return this.workDaysService.listTrackedUsers();
  }

  @Patch('users/:userId')
  @Roles(UserRole.SUPER_ADMIN)
  updateUser(@Param('userId') userId: string, @Body() dto: UpdateUserWorkScheduleDto) {
    return this.workDaysService.updateUserWorkSchedule(userId, dto);
  }

  @Get('my/status')
  getMyStatus(@Req() req: RequestWithUser) {
    return this.workDaysService.getMyStatus(req.user.id, req.user.role as UserRole);
  }

  @Post('my/start')
  startWorkDay(@Req() req: RequestWithUser, @Body() dto: StartWorkDayDto) {
    return this.workDaysService.startWorkDay(
      req.user.id,
      req.user.role as UserRole,
      dto,
      extractMeta(req),
    );
  }

  @Post('my/end')
  endWorkDay(@Req() req: RequestWithUser) {
    return this.workDaysService.endWorkDay(
      req.user.id,
      req.user.role as UserRole,
      extractMeta(req),
    );
  }

  @Post('my/absence/start')
  startAbsence(@Req() req: RequestWithUser, @Body() dto: StartAbsenceDto) {
    return this.workDaysService.startAbsence(req.user.id, dto);
  }

  @Post('my/absence/end')
  endAbsence(@Req() req: RequestWithUser) {
    return this.workDaysService.endAbsence(req.user.id);
  }

  @Post('my/close-forgotten')
  closeForgotten(@Req() req: RequestWithUser, @Body() dto: CloseForgottenWorkDayDto) {
    return this.workDaysService.closeForgottenWorkDay(req.user.id, dto);
  }

  @Get('my/client-ip')
  getMyClientIp(@Req() req: Request) {
    return this.workDaysService.getClientIpInfo(extractMeta(req));
  }

  @Get('my/history')
  listMyHistory(
    @Req() req: RequestWithUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.workDaysService.listMyWorkDays(req.user.id, { dateFrom, dateTo });
  }

  @Get()
  list(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('officeId') officeId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.workDaysService.listWorkDays({ dateFrom, dateTo, officeId, userId });
  }
}
