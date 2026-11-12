import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

const USER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

const SUBSTITUTION_INCLUDE = {
  absentManager: { select: USER_SELECT },
  substituteManager: { select: USER_SELECT },
} satisfies Prisma.ManagerSubstitutionInclude;

type SubstitutionRow = Prisma.ManagerSubstitutionGetPayload<{
  include: typeof SUBSTITUTION_INCLUDE;
}>;

function userName(user: { email: string; firstName: string | null; lastName: string | null }) {
  return [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email;
}

function serialize(row: SubstitutionRow) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const status =
    row.dateFrom.getTime() > today.getTime()
      ? 'upcoming'
      : row.dateTo.getTime() < today.getTime()
        ? 'past'
        : 'active';
  return {
    id: row.id,
    absentManagerId: row.absentManagerId,
    substituteManagerId: row.substituteManagerId,
    dateFrom: row.dateFrom.toISOString().slice(0, 10),
    dateTo: row.dateTo.toISOString().slice(0, 10),
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    absentManager: { id: row.absentManager.id, name: userName(row.absentManager) },
    substituteManager: { id: row.substituteManager.id, name: userName(row.substituteManager) },
    /** Активна ли подмена сейчас: 'active' — идёт, 'upcoming' — предстоит, 'past' — закончилась. */
    status,
  };
}

/**
 * Подмены менеджеров на период отпуска или длительного больничного. Включает режим
 * только супер-админ (вручную, чтобы исключить случайные накладки): в период
 * подмены з/п по договорам отсутствующего менеджера и его личные продажи по
 * платежам ДП начисляются подменяющему (см. расчёт з/п и журнал ДП).
 */
@Injectable()
export class ManagerSubstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Все подмены (настройки з/п): свежие сверху. */
  async list() {
    const rows = await this.prisma.managerSubstitution.findMany({
      include: SUBSTITUTION_INCLUDE,
      orderBy: [{ dateFrom: 'desc' }],
    });
    return rows.map(serialize);
  }

  /** Активные и предстоящие подмены менеджера (баннер в хабе договора). */
  async listActiveForManager(managerId: string) {
    // dateTo включительно: сравниваем с началом сегодняшнего дня (даты — @db.Date).
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const rows = await this.prisma.managerSubstitution.findMany({
      where: {
        OR: [{ absentManagerId: managerId }, { substituteManagerId: managerId }],
        dateTo: { gte: startOfToday },
      },
      include: SUBSTITUTION_INCLUDE,
      orderBy: { dateFrom: 'asc' },
    });
    return rows.map(serialize);
  }

  async create(
    dto: {
      absentManagerId: string;
      substituteManagerId: string;
      dateFrom: string;
      dateTo: string;
      comment?: string;
    },
    createdById?: string,
  ) {
    const [absentManagerId, substituteManagerId, dateFrom, dateTo] = await this.validate(dto);
    const row = await this.prisma.managerSubstitution.create({
      data: {
        absentManagerId,
        substituteManagerId,
        dateFrom,
        dateTo,
        comment: dto.comment?.trim() || null,
        createdById: createdById ?? null,
      },
      include: SUBSTITUTION_INCLUDE,
    });
    return serialize(row);
  }

  async update(
    id: string,
    dto: {
      absentManagerId?: string;
      substituteManagerId?: string;
      dateFrom?: string;
      dateTo?: string;
      comment?: string | null;
    },
  ) {
    const existing = await this.prisma.managerSubstitution.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Подмена не найдена');
    const next = {
      absentManagerId: dto.absentManagerId ?? existing.absentManagerId,
      substituteManagerId: dto.substituteManagerId ?? existing.substituteManagerId,
      dateFrom: dto.dateFrom ?? existing.dateFrom.toISOString().slice(0, 10),
      dateTo: dto.dateTo ?? existing.dateTo.toISOString().slice(0, 10),
    };
    const [absentManagerId, substituteManagerId, dateFromDate, dateToDate] = await this.validate(
      next,
      id,
    );
    const row = await this.prisma.managerSubstitution.update({
      where: { id },
      data: {
        absentManagerId,
        substituteManagerId,
        dateFrom: dateFromDate,
        dateTo: dateToDate,
        comment: dto.comment === undefined ? undefined : dto.comment?.trim() || null,
      },
      include: SUBSTITUTION_INCLUDE,
    });
    return serialize(row);
  }

  async remove(id: string) {
    const existing = await this.prisma.managerSubstitution.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Подмена не найдена');
    await this.prisma.managerSubstitution.delete({ where: { id } });
    return { ok: true };
  }

  /** Проверки: сотрудники существуют, подменяющий ≠ отсутствующему, период
   *  корректен и не пересекается с другой подменой того же менеджера. */
  private async validate(
    dto: { absentManagerId: string; substituteManagerId: string; dateFrom: string; dateTo: string },
    selfId?: string,
  ): Promise<[string, string, Date, Date]> {
    const absentManagerId = dto.absentManagerId?.trim() || '';
    const substituteManagerId = dto.substituteManagerId?.trim() || '';
    if (!absentManagerId || !substituteManagerId) {
      throw new BadRequestException('Укажите отсутствующего и подменяющего менеджеров');
    }
    if (absentManagerId === substituteManagerId) {
      throw new BadRequestException('Менеджер не может подменять сам себя');
    }
    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);
    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
      throw new BadRequestException('Укажите корректные даты периода подмены');
    }
    if (dateFrom.getTime() > dateTo.getTime()) {
      throw new BadRequestException('Начало периода подмены не может быть позже конца');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [absentManagerId, substituteManagerId] } },
      select: { id: true },
    });
    if (users.length < 2) {
      throw new BadRequestException('Один из указанных сотрудников не найден');
    }

    // Пересечение периодов: у отсутствующего менеджера не может быть двух подмен сразу.
    const overlapping = await this.prisma.managerSubstitution.findFirst({
      where: {
        id: selfId ? { not: selfId } : undefined,
        absentManagerId,
        dateFrom: { lte: dateTo },
        dateTo: { gte: dateFrom },
      },
      select: { id: true },
    });
    if (overlapping) {
      throw new BadRequestException(
        'У этого менеджера уже есть подмена в пересекающемся периоде — измените период существующей',
      );
    }
    return [absentManagerId, substituteManagerId, dateFrom, dateTo];
  }
}
