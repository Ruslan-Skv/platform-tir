import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, type WorkDayLeave } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkDayLeaveDto } from './dto/work-day.dto';

type LeaveInclude = WorkDayLeave & {
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
 * Отпуска и больничные сотрудников: отмечает суперадмин за период,
 * в том числе задним числом. Дни периода не считаются прогулами.
 */
@Injectable()
export class WorkDayLeavesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly leaveInclude = {
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

  async listLeaves(params: {
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    officeId?: string;
  }) {
    const where: {
      dateFrom?: { lte?: Date };
      dateTo?: { gte?: Date };
      userId?: string;
      user?: { officeId: string };
    } = {};
    if (params.dateTo) where.dateFrom = { lte: new Date(params.dateTo) };
    if (params.dateFrom) where.dateTo = { gte: new Date(params.dateFrom) };
    if (params.userId) where.userId = params.userId;
    if (params.officeId) where.user = { officeId: params.officeId };
    return this.prisma.workDayLeave.findMany({
      where,
      include: this.leaveInclude,
      orderBy: [{ dateFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createLeave(createdById: string, dto: CreateWorkDayLeaveDto) {
    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);
    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
      throw new BadRequestException('Некорректные даты периода: ожидается формат ГГГГ-ММ-ДД.');
    }
    if (dateFrom > dateTo) {
      throw new BadRequestException('Дата начала не может быть позже даты окончания.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        isActive: true,
        role: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    if (!user || !user.isActive) {
      throw new NotFoundException('Сотрудник не найден или неактивен.');
    }
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('У суперадмина нельзя отметить отпуск или больничный.');
    }

    const overlapping = await this.prisma.workDayLeave.findFirst({
      where: {
        userId: dto.userId,
        dateFrom: { lte: dateTo },
        dateTo: { gte: dateFrom },
      },
      orderBy: { dateFrom: 'asc' },
    });
    if (overlapping) {
      const kind = overlapping.type === 'VACATION' ? 'отпуск' : 'больничный';
      throw new BadRequestException(
        `У сотрудника уже есть ${kind} с ${overlapping.dateFrom.toISOString().slice(0, 10)} по ${overlapping.dateTo.toISOString().slice(0, 10)}, который пересекается с указанными датами.`,
      );
    }

    return this.prisma.workDayLeave.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        dateFrom,
        dateTo,
        comment: dto.comment?.trim() || null,
        createdById,
      },
      include: this.leaveInclude,
    });
  }

  async deleteLeave(id: string) {
    const existing = await this.prisma.workDayLeave.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Отметка об отпуске или больничном не найдена.');
    }
    await this.prisma.workDayLeave.delete({ where: { id } });
    return { id };
  }

  mapLeave(row: LeaveInclude) {
    return {
      ...row,
      dateFrom: dateKey(row.dateFrom),
      dateTo: dateKey(row.dateTo),
    };
  }
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
