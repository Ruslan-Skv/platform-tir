import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type WorkDayHoliday } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkDayHolidayDto } from './dto/work-day.dto';
import { dateKey } from './services/work-day-journal-rows';

type HolidayInclude = WorkDayHoliday & {
  createdBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

/**
 * Нерабочие праздничные дни (или периоды), объявленные суперадмином
 * для всех сотрудников: за такие дни прогул не фиксируется, а выход
 * на работу помечается как «Работа в выходной».
 */
@Injectable()
export class WorkDayHolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly holidayInclude = {
    createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
  };

  async listHolidays(params: { dateFrom?: string; dateTo?: string }) {
    const where: { dateFrom?: { lte: Date }; dateTo?: { gte: Date } } = {};
    if (params.dateTo) where.dateFrom = { lte: new Date(params.dateTo) };
    if (params.dateFrom) where.dateTo = { gte: new Date(params.dateFrom) };
    const rows = await this.prisma.workDayHoliday.findMany({
      where,
      include: this.holidayInclude,
      orderBy: [{ dateFrom: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.mapHoliday(row));
  }

  async createHoliday(createdById: string, dto: CreateWorkDayHolidayDto) {
    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);
    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
      throw new BadRequestException('Некорректные даты периода: ожидается формат ГГГГ-ММ-ДД.');
    }
    if (dateFrom > dateTo) {
      throw new BadRequestException('Дата начала не может быть позже даты окончания.');
    }

    const overlapping = await this.prisma.workDayHoliday.findFirst({
      where: {
        dateFrom: { lte: dateTo },
        dateTo: { gte: dateFrom },
      },
      orderBy: { dateFrom: 'asc' },
    });
    if (overlapping) {
      const existing = overlapping.title ? `«${overlapping.title}»` : 'без названия';
      throw new BadRequestException(
        `Период пересекается с уже объявленными выходными ${existing} с ${dateKey(overlapping.dateFrom)} по ${dateKey(overlapping.dateTo)}.`,
      );
    }

    const row = await this.prisma.workDayHoliday.create({
      data: {
        title: dto.title?.trim() || null,
        dateFrom,
        dateTo,
        createdById,
      },
      include: this.holidayInclude,
    });
    return this.mapHoliday(row);
  }

  async deleteHoliday(id: string) {
    const existing = await this.prisma.workDayHoliday.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Объявленные выходные не найдены.');
    }
    await this.prisma.workDayHoliday.delete({ where: { id } });
    return { id };
  }

  /** Есть ли праздник на дату (для блокировки учёта рабочего дня). */
  async isHolidayDate(date: Date): Promise<boolean> {
    const holiday = await this.prisma.workDayHoliday.findFirst({
      where: { dateFrom: { lte: date }, dateTo: { gte: date } },
      select: { id: true },
    });
    return Boolean(holiday);
  }

  /** Праздничные дни за период: ключ «ГГГГ-ММ-ДД» → отметка праздника. */
  async buildHolidayMap(
    from: Date,
    to: Date,
  ): Promise<Map<string, Pick<WorkDayHoliday, 'id' | 'title'>>> {
    const holidays = await this.prisma.workDayHoliday.findMany({
      where: { dateFrom: { lte: to }, dateTo: { gte: from } },
      select: { id: true, title: true, dateFrom: true, dateTo: true },
      orderBy: [{ dateFrom: 'asc' }, { createdAt: 'asc' }],
    });
    const map = new Map<string, Pick<WorkDayHoliday, 'id' | 'title'>>();
    for (const holiday of holidays) {
      const start = holiday.dateFrom < from ? from : new Date(holiday.dateFrom);
      const end = holiday.dateTo > to ? to : new Date(holiday.dateTo);
      for (let date = new Date(start); date <= end; date = new Date(date.getTime() + 86_400_000)) {
        // При пересечении периодов остаётся первый объявленный праздник.
        if (!map.has(dateKey(date))) {
          map.set(dateKey(date), { id: holiday.id, title: holiday.title });
        }
      }
    }
    return map;
  }

  mapHoliday(row: HolidayInclude) {
    return {
      ...row,
      dateFrom: dateKey(row.dateFrom),
      dateTo: dateKey(row.dateTo),
    };
  }
}
