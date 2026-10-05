import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  DP_FURNITURE_DIRECTION,
  DP_MANUAL_DIRECTION_OTHER,
  MANUAL_MONEY_MOVEMENT_DIRECTIONS,
} from '../../common/config/package-direction-registry.config';
import { PrismaService } from '../../database/prisma.service';
import { CreateCashBookEntryDto } from './dto/create-cash-book-entry.dto';

const MANAGER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

const ENTRY_INCLUDE = {
  manager: { select: MANAGER_SELECT },
} satisfies Prisma.CashBookEntryInclude;

type CashBookRowWithManager = Prisma.CashBookEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

function managerName(user: { email: string; firstName: string | null; lastName: string | null }) {
  return [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email;
}

/** Форма записи кассы для клиента. */
function serializeCashBookEntry(row: CashBookRowWithManager) {
  return {
    id: row.id,
    paymentDate: row.paymentDate.toISOString().slice(0, 10),
    performedAt: row.performedAt.toISOString(),
    amount: row.amount.toString(),
    manager: row.manager
      ? {
          id: row.manager.id,
          name: managerName(row.manager),
        }
      : null,
    direction: row.direction,
    contractNumber: row.contractNumber,
    customerName: row.customerName,
    executorName: row.executorName,
    basis: row.basis,
    notes: row.notes,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Раздел «Касса»: собственные ручные записи движений наличных ДС. */
@Injectable()
export class CashBookService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Записи кассы за период. В отличие от журнала ДП это отдельная сущность:
   * записи кассы не попадают в ДП и не участвуют в его сверке.
   */
  async findAll(params: {
    dateFrom?: string;
    dateTo?: string;
    managerId?: string;
    search?: string;
    page?: number;
    limit?: number;
    /** Текущий пользователь — попадает в список менеджеров модалки записи. */
    requesterId?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const search = params.search?.trim();

    const where: Prisma.CashBookEntryWhereInput = {
      ...(params.dateFrom || params.dateTo
        ? {
            paymentDate: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999`) } : {}),
            },
          }
        : {}),
      ...(params.managerId ? { managerId: params.managerId } : {}),
      ...(search
        ? {
            OR: [
              { contractNumber: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { basis: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
            ] as Prisma.CashBookEntryWhereInput[],
          }
        : {}),
    };

    const [total, rows, sumAgg, byManagerAgg] = await Promise.all([
      this.prisma.cashBookEntry.count({ where }),
      this.prisma.cashBookEntry.findMany({
        where,
        include: ENTRY_INCLUDE,
        orderBy: [{ paymentDate: 'desc' }, { performedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cashBookEntry.aggregate({ where, _sum: { amount: true } }),
      this.prisma.cashBookEntry.groupBy({
        by: ['managerId'],
        where,
        _sum: { amount: true },
      }),
    ]);

    // Имена менеджеров плиток + список менеджеров для модалки записи
    // (участники кассы за период + текущий пользователь).
    const managerIds = [
      ...new Set([
        ...byManagerAgg.map((row) => row.managerId).filter((id): id is string => Boolean(id)),
        ...(params.requesterId ? [params.requesterId] : []),
      ]),
    ];
    const managerUsers = managerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: managerIds } },
          select: MANAGER_SELECT,
        })
      : [];
    const nameById = new Map(managerUsers.map((u) => [u.id, managerName(u)]));

    const byManager = byManagerAgg
      .map((row) => ({
        managerId: row.managerId ?? '__none',
        name: row.managerId ? (nameById.get(row.managerId) ?? row.managerId) : 'Без менеджера',
        sum: Number(row._sum.amount ?? 0),
      }))
      .sort((a, b) => b.sum - a.sum);

    const managers = managerIds
      .map((id) => ({ id, name: nameById.get(id) ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    return {
      data: rows.map((row) => serializeCashBookEntry(row)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      totalSum: Number(sumAgg._sum.amount ?? 0),
      byManager,
      managers,
    };
  }

  /**
   * Ручная запись в кассе: внесение в кассу (amount > 0) или изъятие (amount < 0).
   * Запись живёт только в кассе — в журнал ДП не попадает.
   */
  async createEntry(dto: CreateCashBookEntryDto, currentUserId?: string) {
    const managerId = dto.managerId?.trim() || currentUserId;
    if (!managerId) {
      throw new BadRequestException('Не определён менеджер, по кассе которого проводится запись');
    }
    const managerExists = await this.prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true },
    });
    if (!managerExists) throw new BadRequestException('Указанный менеджер не найден');

    const direction = dto.direction?.trim() || null;
    if (direction && !MANUAL_MONEY_MOVEMENT_DIRECTIONS.includes(direction)) {
      throw new BadRequestException(
        `Неизвестное направление «${direction}»: выберите направление договоров, «Материалы» или «Прочее»`,
      );
    }
    // № договора и заказчик — только у записей по направлениям и «Материалам»;
    // исполнитель — только у «Мебели»; «Прочее» — вне договоров.
    const withContract = Boolean(direction) && direction !== DP_MANUAL_DIRECTION_OTHER;
    const withExecutor = direction === DP_FURNITURE_DIRECTION;

    const now = new Date();
    const row = await this.prisma.cashBookEntry.create({
      data: {
        paymentDate: now,
        performedAt: now,
        amount: dto.amount,
        managerId,
        direction,
        contractNumber: withContract ? dto.contractNumber?.trim() || null : null,
        customerName: withContract ? dto.customerName?.trim() || null : null,
        executorName: withExecutor ? dto.executorName?.trim() || null : null,
        basis: dto.basis.trim(),
        notes: dto.notes?.trim() || null,
        createdById: currentUserId,
      },
      include: ENTRY_INCLUDE,
    });
    return serializeCashBookEntry(row);
  }
}
