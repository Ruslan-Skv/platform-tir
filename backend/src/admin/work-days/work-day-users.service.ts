import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import { UpdateUserWorkScheduleDto } from './dto/work-day.dto';
import { type WeeklySchedule } from './utils/weekly-schedule.types';
import {
  USER_WORK_SCHEDULE_SELECT,
  legacyFieldsFromWeeklySchedule,
} from './work-day-schedule.helpers';

/**
 * Индивидуальные настройки учёта рабочего времени сотрудников:
 * расписание (общее или кастомное), привязка к офису, включение трекинга.
 * Отдельный справочник для суперадмина на странице настроек.
 */
@Injectable()
export class WorkDayUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateUserWorkSchedule(userId: string, dto: UpdateUserWorkScheduleDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    const data: Record<string, unknown> = {};
    if (dto.officeId !== undefined) data.officeId = dto.officeId;
    if (dto.workDayTrackingEnabled !== undefined) {
      data.workDayTrackingEnabled = dto.workDayTrackingEnabled;
    }
    if (dto.useCustomWorkSchedule !== undefined)
      data.useCustomWorkSchedule = dto.useCustomWorkSchedule;
    if (dto.workDayStartTime !== undefined) data.workDayStartTime = dto.workDayStartTime;
    if (dto.workDayEndTime !== undefined) data.workDayEndTime = dto.workDayEndTime;
    if (dto.workDaysOfWeek !== undefined) data.workDaysOfWeek = dto.workDaysOfWeek;
    if (dto.gracePeriodMinutes !== undefined) data.gracePeriodMinutes = dto.gracePeriodMinutes;
    if (dto.workDayWeeklySchedule !== undefined) {
      data.workDayWeeklySchedule = dto.workDayWeeklySchedule;
      Object.assign(
        data,
        legacyFieldsFromWeeklySchedule(dto.workDayWeeklySchedule as WeeklySchedule),
      );
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_WORK_SCHEDULE_SELECT,
    });
  }

  async listTrackedUsers() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ADMIN_ROLES.filter((r) => r !== UserRole.SUPER_ADMIN) },
      },
      select: USER_WORK_SCHEDULE_SELECT,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }
}
