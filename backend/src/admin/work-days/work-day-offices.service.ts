import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateOfficeWorkScheduleDto } from './dto/work-day.dto';
import {
  OFFICE_WORK_SCHEDULE_SELECT,
  legacyFieldsFromWeeklySchedule,
} from './work-day-schedule.helpers';
import { type WeeklySchedule } from './utils/weekly-schedule.types';

@Injectable()
export class WorkDayOfficesService {
  constructor(private readonly prisma: PrismaService) {}

  async updateOfficeWorkSchedule(officeId: string, dto: UpdateOfficeWorkScheduleDto) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!office) throw new NotFoundException('Офис не найден');
    const data: Record<string, unknown> = { ...dto };
    if (dto.workDayWeeklySchedule !== undefined) {
      Object.assign(
        data,
        legacyFieldsFromWeeklySchedule(dto.workDayWeeklySchedule as WeeklySchedule),
      );
    }
    return this.prisma.office.update({
      where: { id: officeId },
      data,
      select: OFFICE_WORK_SCHEDULE_SELECT,
    });
  }

  async listOfficesWithSchedule() {
    return this.prisma.office.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: OFFICE_WORK_SCHEDULE_SELECT,
    });
  }

  /**
   * Активные офисы для выбора в модалке «Начните рабочий день».
   * Отдельный маршрут под /my/* (вне проверки прав настроек),
   * чтобы любой отслеживаемый сотрудник мог выбрать офис при открытии дня.
   */
  async listMyOffices() {
    return this.prisma.office.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: OFFICE_WORK_SCHEDULE_SELECT,
    });
  }
}
