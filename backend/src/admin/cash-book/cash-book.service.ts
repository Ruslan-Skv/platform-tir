import { Injectable } from '@nestjs/common';
import { PaymentForm, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ManualEntriesService } from '../money-movements/manual-entries.service';
import { serializeMoneyMovement } from '../money-movements/money-movement-serialize';
import { CreateCashBookEntryDto } from './dto/create-cash-book-entry.dto';

const MANAGER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

const MOVEMENT_INCLUDE = {
  manager: { select: MANAGER_SELECT },
} satisfies Prisma.MoneyMovementInclude;

function managerName(user: { email: string; firstName: string | null; lastName: string | null }) {
  return [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email;
}

/** Раздел «Касса»: сверённые наличные оплаты журнала ДП + ручные записи кассы. */
@Injectable()
export class CashBookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly manualEntries: ManualEntriesService,
  ) {}

  /**
   * Записи кассы за период: наличные оплаты, отмеченные сверёнными супер-админом
   * в журнале ДП (золотая печать). Удалённые в корзину ДП не участвуют.
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

    const where: Prisma.MoneyMovementWhereInput = {
      deletedAt: null,
      paymentForm: PaymentForm.CASH,
      manualReconciledAt: { not: null },
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
            ] as Prisma.MoneyMovementWhereInput[],
          }
        : {}),
    };

    const [total, rows, sumAgg, byManagerAgg] = await Promise.all([
      this.prisma.moneyMovement.count({ where }),
      this.prisma.moneyMovement.findMany({
        where,
        include: MOVEMENT_INCLUDE,
        orderBy: [{ paymentDate: 'desc' }, { performedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.moneyMovement.aggregate({ where, _sum: { amount: true } }),
      this.prisma.moneyMovement.groupBy({
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
      data: rows.map((row) => serializeMoneyMovement(row)),
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
   * Ручная запись в кассе: та же проводка, что «+ Запись» в журнале ДП, но способ
   * всегда «Наличные» и запись сразу сверена — касса учитывает только свёрнные
   * наличные, иначе созданная запись в разделе была бы не видна.
   */
  async createEntry(dto: CreateCashBookEntryDto, currentUserId?: string) {
    const created = await this.manualEntries.createManualEntry(
      {
        managerId: dto.managerId,
        amount: dto.amount,
        paymentForm: PaymentForm.CASH,
        direction: dto.direction,
        contractNumber: dto.contractNumber,
        customerName: dto.customerName,
        executorName: dto.executorName,
        basis: dto.basis,
        notes: dto.notes,
      },
      currentUserId,
      { markReconciled: true },
    );
    return created;
  }
}
