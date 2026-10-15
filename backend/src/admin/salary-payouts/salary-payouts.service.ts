import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentType, Prisma, SalaryPayoutCategory, SalaryPayoutMethod } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { MoneyMovementsService } from '../money-movements/money-movements.service';
import { CreateSalaryPayoutDto } from './dto/create-salary-payout.dto';
import { UpdateSalaryPayoutDto } from './dto/update-salary-payout.dto';
import {
  compareSalaryPayoutsDesc,
  serializeSalaryDpMovement,
  serializeSalaryPayout,
  serializeUserName,
  type SerializedSalaryPayout,
} from './salary-payout-serialize';

const USER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

const PAYOUT_INCLUDE = {
  recipientUser: { select: USER_SELECT },
  manager: { select: USER_SELECT },
  createdBy: { select: USER_SELECT },
} satisfies Prisma.SalaryPayoutInclude;

const DP_INCLUDE = {
  manager: { select: USER_SELECT },
  createdBy: { select: USER_SELECT },
} satisfies Prisma.MoneyMovementInclude;

/** Итог по получателю за период (плитки/список итогов журнала). */
type RecipientTotals = { name: string; sum: number; count: number };

@Injectable()
export class SalaryPayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moneyMovements: MoneyMovementsService,
  ) {}

  /**
   * Журнал выплат з/п за период: записи раздела «Выплаты з/п» + ручные записи
   * журнала ДП с основанием «Зар/плата» (менеджеры проводят свои наличные
   * выплаты сами). Итоги — по обоим источникам, с разбивкой нал/банк и по получателям.
   */
  async findAll(params: {
    dateFrom?: string;
    dateTo?: string;
    method?: 'CASH' | 'BANK';
    source?: 'PAYOUT' | 'DP';
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const search = params.search?.trim();
    const includeDp = params.source !== 'PAYOUT';
    const includePayouts = params.source !== 'DP';

    const paidAtFilter =
      params.dateFrom || params.dateTo
        ? {
            paidAt: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999`) } : {}),
            },
          }
        : undefined;
    const paymentDateFilter =
      params.dateFrom || params.dateTo
        ? {
            paymentDate: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999`) } : {}),
            },
          }
        : undefined;

    // Записи раздела: способ и поиск — по собственным полям.
    const payoutWhere: Prisma.SalaryPayoutWhereInput = {
      deletedAt: null,
      ...(params.method ? { paymentMethod: params.method } : {}),
      ...(paidAtFilter ?? {}),
      ...(search
        ? {
            OR: [
              { recipientName: { contains: search, mode: 'insensitive' } },
              { note: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Ручные записи ДП «Зар/плата»: способ определяется формой оплаты
    // (наличные → CASH, остальные формы — безнал → BANK).
    const dpWhere: Prisma.MoneyMovementWhereInput = {
      deletedAt: null,
      paymentType: PaymentType.OTHER,
      sourceId: null,
      salaryRecipientName: { not: null },
      ...(params.method === 'CASH'
        ? { paymentForm: 'CASH' }
        : params.method === 'BANK'
          ? { paymentForm: { not: 'CASH' } }
          : {}),
      ...(paymentDateFilter ?? {}),
      ...(search
        ? {
            OR: [
              { salaryRecipientName: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
              { basis: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Страница объединённого списка: из каждого источника достаточно skip + limit
    // отсортированных строк — слияние и срез дают страницу объединения.
    const skip = (page - 1) * limit;
    const fetchTake = skip + limit;

    const [
      payoutTotal,
      payoutRows,
      payoutSum,
      payoutByRecipient,
      dpTotal,
      dpRows,
      dpSum,
      dpByRecipient,
      directoryUserIds,
    ] = await Promise.all([
      includePayouts ? this.prisma.salaryPayout.count({ where: payoutWhere }) : Promise.resolve(0),
      includePayouts
        ? this.prisma.salaryPayout.findMany({
            where: payoutWhere,
            include: PAYOUT_INCLUDE,
            orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            take: fetchTake,
          })
        : Promise.resolve(
            [] as Prisma.SalaryPayoutGetPayload<{ include: typeof PAYOUT_INCLUDE }>[],
          ),
      includePayouts
        ? this.prisma.salaryPayout.aggregate({ where: payoutWhere, _sum: { amount: true } })
        : Promise.resolve({ _sum: { amount: null as Prisma.Decimal | null } }),
      includePayouts
        ? this.prisma.salaryPayout.groupBy({
            by: ['recipientName'],
            where: payoutWhere,
            _sum: { amount: true },
            _count: { _all: true },
          })
        : Promise.resolve(
            [] as {
              recipientName: string;
              _sum: { amount: Prisma.Decimal | null };
              _count: { _all: number };
            }[],
          ),
      includeDp ? this.prisma.moneyMovement.count({ where: dpWhere }) : Promise.resolve(0),
      includeDp
        ? this.prisma.moneyMovement.findMany({
            where: dpWhere,
            include: DP_INCLUDE,
            orderBy: [{ paymentDate: 'desc' }, { performedAt: 'desc' }, { id: 'desc' }],
            take: fetchTake,
          })
        : Promise.resolve([] as Prisma.MoneyMovementGetPayload<{ include: typeof DP_INCLUDE }>[]),
      includeDp
        ? this.prisma.moneyMovement.aggregate({ where: dpWhere, _sum: { amount: true } })
        : Promise.resolve({ _sum: { amount: null as Prisma.Decimal | null } }),
      includeDp
        ? this.prisma.moneyMovement.groupBy({
            by: ['salaryRecipientName'],
            where: dpWhere,
            _sum: { amount: true },
            _count: { _all: true },
          })
        : Promise.resolve(
            [] as {
              salaryRecipientName: string | null;
              _sum: { amount: Prisma.Decimal | null };
              _count: { _all: number };
            }[],
          ),
      this.moneyMovements.getSignatoryProfileUserIds(),
    ]);

    const total = payoutTotal + dpTotal;
    const rows: SerializedSalaryPayout[] = [
      ...payoutRows.map(serializeSalaryPayout),
      ...dpRows.map(serializeSalaryDpMovement),
    ]
      .sort(compareSalaryPayoutsDesc)
      .slice(skip, skip + limit);

    // Итоги — по обоим источникам; записи ДП хранят сумму со знаком минус — берём модуль.
    const payoutSumValue = Number(payoutSum._sum.amount ?? 0);
    const dpSumValue = Math.abs(Number(dpSum._sum.amount ?? 0));
    const totalSum = payoutSumValue + dpSumValue;

    const byRecipientMap = new Map<string, RecipientTotals>();
    for (const row of payoutByRecipient) {
      byRecipientMap.set(row.recipientName, {
        name: row.recipientName,
        sum: Number(row._sum.amount ?? 0),
        count: row._count._all,
      });
    }
    for (const row of dpByRecipient) {
      if (!row.salaryRecipientName) continue;
      const existing = byRecipientMap.get(row.salaryRecipientName);
      const sum = Math.abs(Number(row._sum.amount ?? 0));
      if (existing) {
        existing.sum += sum;
        existing.count += row._count._all;
      } else {
        byRecipientMap.set(row.salaryRecipientName, {
          name: row.salaryRecipientName,
          sum,
          count: row._count._all,
        });
      }
    }
    const byRecipient = [...byRecipientMap.values()].sort((a, b) => b.sum - a.sum);

    // Наличные/банк: у записей раздела способ известен напрямую, у записей ДП
    // способом служит форма оплаты (наличные/безнал). Считаем отдельными запросами.
    const [cashPayoutSum, bankPayoutSum, cashDpSum, bankDpSum] = await Promise.all([
      includePayouts
        ? this.prisma.salaryPayout.aggregate({
            where: { ...payoutWhere, paymentMethod: SalaryPayoutMethod.CASH },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: null as Prisma.Decimal | null } }),
      includePayouts
        ? this.prisma.salaryPayout.aggregate({
            where: { ...payoutWhere, paymentMethod: SalaryPayoutMethod.BANK },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: null as Prisma.Decimal | null } }),
      includeDp
        ? this.prisma.moneyMovement.aggregate({
            where: { ...dpWhere, paymentForm: 'CASH' },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: null as Prisma.Decimal | null } }),
      includeDp
        ? this.prisma.moneyMovement.aggregate({
            where: { ...dpWhere, paymentForm: { not: 'CASH' } },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: null as Prisma.Decimal | null } }),
    ]);

    const cashSum =
      Number(cashPayoutSum._sum.amount ?? 0) + Math.abs(Number(cashDpSum._sum.amount ?? 0));
    const bankSum =
      Number(bankPayoutSum._sum.amount ?? 0) + Math.abs(Number(bankDpSum._sum.amount ?? 0));

    // Справочник «Карточки менеджеров» — получатели-сотрудники для модалки выплаты
    // (тот же список, что в селекте менеджера ручной записи ДП).
    const nameUsers = directoryUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: directoryUserIds } },
          select: USER_SELECT,
        })
      : [];
    const managers = nameUsers
      .map((u) => ({ id: u.id, name: serializeUserName(u) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      totalSum,
      cashSum,
      bankSum,
      byRecipient,
      managers,
    };
  }

  /**
   * Выплата з/п: наличная — из кассы менеджера (попадает в кассу проекцией),
   * безналичная — перевод по банку (попадает в раздел «Банк»).
   */
  async create(dto: CreateSalaryPayoutDto, currentUserId?: string) {
    if (!currentUserId) throw new BadRequestException('Пользователь не определён');

    const recipient = await this.resolveRecipient(dto);
    if (!recipient) {
      throw new BadRequestException('Укажите получателя выплаты (сотрудника или ФИО)');
    }
    // Касса менеджера — у наличной выплаты (по умолчанию текущий пользователь);
    // у безналичной менеджер не нужен.
    const managerId =
      dto.managerId !== undefined || dto.paymentMethod === SalaryPayoutMethod.CASH
        ? await this.resolveManager(dto, currentUserId)
        : null;

    const row = await this.prisma.salaryPayout.create({
      data: {
        paidAt: new Date(dto.paidAt),
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        category: dto.category ?? SalaryPayoutCategory.SALARY,
        recipientUserId: recipient.userId,
        recipientName: recipient.name,
        managerId,
        note: dto.note?.trim() || null,
        createdById: currentUserId,
      },
      include: PAYOUT_INCLUDE,
    });
    return serializeSalaryPayout(row);
  }

  /** Правка выплаты — только супер-админ (исправление ошибок). */
  async update(id: string, dto: UpdateSalaryPayoutDto) {
    const existing = await this.prisma.salaryPayout.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Выплата не найдена');
    if (existing.deletedAt) throw new BadRequestException('Выплата удалена и не редактируется');

    const recipient = await this.resolveRecipient({
      recipientUserId: dto.recipientUserId,
      recipientName: dto.recipientName,
    });
    const managerId = await this.resolveManager(
      { managerId: dto.managerId },
      dto.managerId === undefined ? (existing.managerId ?? undefined) : undefined,
    );

    const row = await this.prisma.salaryPayout.update({
      where: { id },
      data: {
        ...(dto.paidAt !== undefined ? { paidAt: new Date(dto.paidAt) } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod } : {}),
        ...(dto.category !== undefined
          ? { category: dto.category ?? SalaryPayoutCategory.SALARY }
          : {}),
        ...(recipient ? { recipientUserId: recipient.userId, recipientName: recipient.name } : {}),
        ...(managerId !== undefined ? { managerId } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
      },
      include: PAYOUT_INCLUDE,
    });
    return serializeSalaryPayout(row);
  }

  /** Удаление ошибочной выплаты (мягкое): исчезает из журнала, кассы и банка. */
  async remove(id: string) {
    const existing = await this.prisma.salaryPayout.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Выплата не найдена');
    if (existing.deletedAt) throw new BadRequestException('Выплата уже удалена');
    await this.prisma.salaryPayout.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  /** Получатель выплаты: сотрудник из справочника (имя — снимок) или ФИО вручную.
   *  null — поля не заданы (частичная правка без смены получателя). */
  private async resolveRecipient(dto: {
    recipientUserId?: string;
    recipientName?: string;
  }): Promise<{ userId: string | null; name: string } | null> {
    if (dto.recipientUserId === undefined && dto.recipientName === undefined) return null;
    const userId = dto.recipientUserId?.trim();
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: USER_SELECT,
      });
      if (!user) throw new BadRequestException('Указанный получатель не найден');
      return { userId, name: serializeUserName(user) };
    }
    const name = dto.recipientName?.trim();
    if (!name || name.length < 2) {
      throw new BadRequestException('Укажите получателя выплаты (сотрудника или ФИО)');
    }
    return { userId: null, name };
  }

  /** Касса менеджера для наличной выплаты; по умолчанию — текущий пользователь. */
  private async resolveManager(
    dto: { managerId?: string },
    fallback?: string,
  ): Promise<string | null | undefined> {
    if (dto.managerId !== undefined) {
      const managerId = dto.managerId?.trim();
      if (!managerId) return null;
      const exists = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true },
      });
      if (!exists) throw new BadRequestException('Указанный менеджер не найден');
      return managerId;
    }
    if (fallback !== undefined) return fallback;
    return undefined;
  }
}
