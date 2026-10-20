import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, type WorkDayExcuse } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkDayExcuseDto } from './dto/work-day.dto';

type ExcuseInclude = WorkDayExcuse & {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
    officeId: string | null;
    office: { id: string; name: string } | null;
  };
  createdBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

/**
 * Прощённые суперадмином нарушения режима работы (опоздание, ранний уход,
 * автозакрытие, прогул) за конкретную дату сотрудника. Факт нарушения
 * сохраняется в журнале суперадмина с пометкой «прощено», но удержание
 * из оклада не начисляется, а в «Моём рабочем дне» сотрудника нарушение
 * не отображается вовсе.
 */
@Injectable()
export class WorkDayExcusesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly excuseInclude = {
    user: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        officeId: true,
        office: { select: { id: true, name: true } },
      },
    },
    createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
  };

  async listExcuses(params: {
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    officeId?: string;
  }) {
    const where: {
      workDate?: { gte?: Date; lte?: Date };
      userId?: string;
      user?: { officeId: string };
    } = {};
    if (params.dateFrom) where.workDate = { ...where.workDate, gte: new Date(params.dateFrom) };
    if (params.dateTo) where.workDate = { ...where.workDate, lte: new Date(params.dateTo) };
    if (params.userId) where.userId = params.userId;
    if (params.officeId) where.user = { officeId: params.officeId };
    return this.prisma.workDayExcuse.findMany({
      where,
      include: this.excuseInclude,
      orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createExcuse(createdById: string, dto: CreateWorkDayExcuseDto) {
    const workDate = new Date(dto.workDate);
    if (Number.isNaN(workDate.getTime())) {
      throw new BadRequestException('Некорректная дата: ожидается формат ГГГГ-ММ-ДД.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new NotFoundException('Сотрудник не найден или неактивен.');
    }

    // Уникальность [userId, workDate, kind] — повторная отметка обновляет комментарий.
    const kinds = [...new Set(dto.kinds)];
    return this.prisma.$transaction(
      kinds.map((kind) =>
        this.prisma.workDayExcuse.upsert({
          where: { userId_workDate_kind: { userId: dto.userId, workDate, kind } },
          create: {
            userId: dto.userId,
            workDate,
            kind,
            comment: dto.comment?.trim() || null,
            createdById,
          },
          update: {
            comment: dto.comment?.trim() || null,
            createdById,
          },
          include: this.excuseInclude,
        }),
      ),
    );
  }

  async deleteExcuse(id: string) {
    const existing = await this.prisma.workDayExcuse.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Отметка о прощённом нарушении не найдена.');
    }
    await this.prisma.workDayExcuse.delete({ where: { id } });
    return { id };
  }

  mapExcuse(row: ExcuseInclude) {
    return {
      ...row,
      workDate: dateKey(row.workDate),
    };
  }
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
