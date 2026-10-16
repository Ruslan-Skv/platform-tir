import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentForm, Prisma } from '@prisma/client';

import {
  DP_FURNITURE_DIRECTION,
  DP_MANUAL_DIRECTION_OTHER,
  MANUAL_MONEY_MOVEMENT_DIRECTIONS,
} from '../../common/config/package-direction-registry.config';
import { PrismaService } from '../../database/prisma.service';
import { SALARY_PAYOUT_BASIS } from '../../common/constants/salary-payout';
import { MoneyMovementsService } from '../money-movements/money-movements.service';
import { CashBookBalanceService } from './cash-book-balance.service';
import { CreateCashBookEntryDto } from './dto/create-cash-book-entry.dto';
import { SetOpeningBalanceDto } from './dto/set-opening-balance.dto';
import {
  CASH_ENTRY_KIND_MANUAL,
  CASH_ENTRY_KIND_OPENING,
  ENTRY_INCLUDE,
  MANAGER_SELECT,
  MOVEMENT_INCLUDE,
  OPENING_BALANCE_BASIS,
  PAYOUT_INCLUDE,
  type SalaryAdvanceRawRow,
  cashSearchFilter,
  compareCashEntriesDesc,
  escapeLike,
  managerName,
  movementSearchFilter,
  serializeCashBookEntry,
  serializeMovementAsCashEntry,
  serializeOpeningBalance,
  serializeSalaryAdvanceAsCashEntry,
  serializeSalaryPayoutAsCashEntry,
} from './cash-book-serialize';

/** Раздел «Касса»: свёрнутые наличные оплаты ДП + собственные ручные записи кассы
 *  + выплаты мастерам наличными из расчётов (зар/плата, сумма со знаком минус)
 *  + наличные выплаты з/п из раздела «Выплаты з/п» (проекция, со знаком минус). */
@Injectable()
export class CashBookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moneyMovements: MoneyMovementsService,
    private readonly balance: CashBookBalanceService,
  ) {}

  /**
   * Записи кассы за период: наличные оплаты журнала ДП, отмеченные сверёнными
   * супер-админом (золотая печать), + собственные ручные записи кассы
   * + выплаты мастерам из расчётов со способом оплаты «Наличные» (синхронно,
   * со знаком минус; колонка зар/платы — ФИО получившего мастера).
   * Связь с ДП односторонняя: касса читает наличные ДП, но её записи в ДП не попадают.
   */
  async findAll(params: {
    dateFrom?: string;
    dateTo?: string;
    managerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const search = params.search?.trim();

    const periodFilter =
      params.dateFrom || params.dateTo
        ? {
            paymentDate: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999`) } : {}),
            },
          }
        : undefined;
    const payoutPeriodFilter =
      params.dateFrom || params.dateTo
        ? {
            paidAt: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999`) } : {}),
            },
          }
        : undefined;
    const managerFilter = params.managerId ? { managerId: params.managerId } : undefined;
    const searchFilter = search ? cashSearchFilter(search) : undefined;

    // Наличные ДП попадают в кассу, только когда свёрнуты вручную (золотая печать);
    // удалённые в корзину ДП не участвуют.
    const dpWhere: Prisma.MoneyMovementWhereInput = {
      deletedAt: null,
      paymentForm: PaymentForm.CASH,
      manualReconciledAt: { not: null },
      ...(periodFilter ?? {}),
      ...(managerFilter ?? {}),
      ...(search ? movementSearchFilter(search) : {}),
    };
    const cashWhere: Prisma.CashBookEntryWhereInput = {
      ...(periodFilter ?? {}),
      ...(managerFilter ?? {}),
      ...(searchFilter ?? {}),
    };
    /** Итоги оборотов — только ручные записи: начальный остаток не является
     *  оборотом периода (он входит в остатки, но не в «Итого за период»). */
    const cashTotalsWhere: Prisma.CashBookEntryWhereInput = {
      ...cashWhere,
      kind: CASH_ENTRY_KIND_MANUAL,
    };

    // Четвёртый источник кассы — наличные выплаты з/п из раздела «Выплаты з/п»:
    // попадают синхронно, без сверки (как выплаты мастерам), со знаком минус.
    const payoutWhere: Prisma.SalaryPayoutWhereInput = {
      deletedAt: null,
      paymentMethod: 'CASH',
      ...(payoutPeriodFilter ?? {}),
      ...(managerFilter ?? {}),
      ...(search
        ? {
            OR: [
              { recipientName: { contains: search, mode: 'insensitive' } },
              { note: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Третий источник кассы — выплаты мастерам из расчётов («Наличные»): попадают
    // синхронно, без сверки. Менеджер кассы — кто выдал (создатель записи расчёта).
    const salaryPattern = search ? `%${escapeLike(search)}%` : '';
    const salaryDateConditions: Prisma.Sql[] = [];
    if (params.dateFrom)
      salaryDateConditions.push(Prisma.sql`a."paidAt" >= ${params.dateFrom}::date`);
    if (params.dateTo) salaryDateConditions.push(Prisma.sql`a."paidAt" <= ${params.dateTo}::date`);
    const fromSalaryAdvances = Prisma.sql`
      FROM contract_document_package_installer_advances a
      JOIN contract_document_packages p ON p."id" = a."packageId"
      LEFT JOIN installer_masters inst ON inst."id" = a."installerId"
      LEFT JOIN users u ON u."id" = a."createdById"
      WHERE p."deleted_at" IS NULL AND a."paymentMethod" = 'CASH'${
        salaryDateConditions.length
          ? Prisma.sql` AND ${Prisma.join(salaryDateConditions, ' AND ')}`
          : Prisma.empty
      }${params.managerId ? Prisma.sql` AND a."createdById" = ${params.managerId}` : Prisma.empty}${
        salaryPattern
          ? Prisma.sql` AND (
              COALESCE(inst."fullName", a."installerName", '') ILIKE ${salaryPattern}
              OR COALESCE(a."note", '') ILIKE ${salaryPattern}
              OR COALESCE(p."formData"->'contract'->>'number', '') ILIKE ${salaryPattern}
              OR COALESCE(p."formData"->'customer'->>'fullName', '') ILIKE ${salaryPattern}
              OR ${SALARY_PAYOUT_BASIS} ILIKE ${salaryPattern}
            )`
          : Prisma.empty
      }`;

    // Страница объединённого списка: из каждого источника достаточно skip + limit
    // отсортированных строк — слияние и срез дают страницу объединения.
    const skip = (page - 1) * limit;
    const fetchTake = skip + limit;

    const [
      dpTotal,
      cashTotal,
      dpRows,
      cashRows,
      dpSum,
      cashSum,
      dpByManagerRaw,
      cashByManagerRaw,
      salaryTotal,
      salaryRows,
      salarySum,
      salaryByManagerRaw,
      payoutTotal,
      payoutRows,
      payoutSum,
      payoutByManagerRaw,
      directoryUserIds,
      { balance, openingBalance },
    ] = await Promise.all([
      this.prisma.moneyMovement.count({ where: dpWhere }),
      this.prisma.cashBookEntry.count({ where: cashWhere }),
      this.prisma.moneyMovement.findMany({
        where: dpWhere,
        include: MOVEMENT_INCLUDE,
        orderBy: [{ paymentDate: 'desc' }, { performedAt: 'desc' }, { id: 'desc' }],
        take: fetchTake,
      }),
      this.prisma.cashBookEntry.findMany({
        where: cashWhere,
        include: ENTRY_INCLUDE,
        orderBy: [{ paymentDate: 'desc' }, { performedAt: 'desc' }, { id: 'desc' }],
        take: fetchTake,
      }),
      this.prisma.moneyMovement.aggregate({ where: dpWhere, _sum: { amount: true } }),
      this.prisma.cashBookEntry.aggregate({ where: cashTotalsWhere, _sum: { amount: true } }),
      this.prisma.moneyMovement.groupBy({
        by: ['managerId'],
        where: dpWhere,
        _sum: { amount: true },
      }),
      this.prisma.cashBookEntry.groupBy({
        by: ['managerId'],
        where: cashTotalsWhere,
        _sum: { amount: true },
      }),
      this.prisma.$queryRaw<Array<{ total: number }>>(
        Prisma.sql`SELECT COUNT(*)::int AS "total"${fromSalaryAdvances}`,
      ),
      this.prisma.$queryRaw<SalaryAdvanceRawRow[]>(Prisma.sql`
          SELECT a."id", a."installerName", a."paidAt", a."amount", a."note",
            a."createdAt", a."updatedAt", a."createdById",
            inst."fullName" AS "installerLiveName",
            u."firstName" AS "createdByFirstName", u."lastName" AS "createdByLastName",
            u."email" AS "createdByEmail",
            p."kind" AS "packageKind",
            p."formData"->'contract'->>'number' AS "contractNumber",
            p."formData"->'customer'->>'fullName' AS "customerName"
          ${fromSalaryAdvances}
          ORDER BY a."paidAt" DESC, a."createdAt" DESC, a."id" DESC
          LIMIT ${fetchTake}`),
      this.prisma.$queryRaw<Array<{ sum: Prisma.Decimal | number }>>(
        Prisma.sql`SELECT COALESCE(SUM(a."amount"), 0) AS "sum"${fromSalaryAdvances}`,
      ),
      this.prisma.$queryRaw<Array<{ managerId: string | null; sum: Prisma.Decimal | number }>>(
        Prisma.sql`SELECT a."createdById" AS "managerId", COALESCE(SUM(a."amount"), 0) AS "sum"${fromSalaryAdvances} GROUP BY a."createdById"`,
      ),
      this.prisma.salaryPayout.count({ where: payoutWhere }),
      this.prisma.salaryPayout.findMany({
        where: payoutWhere,
        include: PAYOUT_INCLUDE,
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: fetchTake,
      }),
      this.prisma.salaryPayout.aggregate({ where: payoutWhere, _sum: { amount: true } }),
      this.prisma.salaryPayout.groupBy({
        by: ['managerId'],
        where: payoutWhere,
        _sum: { amount: true },
      }),
      this.moneyMovements.getSignatoryProfileUserIds(),
      // Остатки — отдельным сервисом: только границы периода, без фильтров.
      this.balance.compute({ dateFrom: params.dateFrom, dateTo: params.dateTo }),
    ]);

    const total = dpTotal + cashTotal + (salaryTotal[0]?.total ?? 0) + payoutTotal;

    const rows = [
      ...dpRows.map(serializeMovementAsCashEntry),
      ...cashRows.map(serializeCashBookEntry),
      ...salaryRows.map(serializeSalaryAdvanceAsCashEntry),
      ...payoutRows.map(serializeSalaryPayoutAsCashEntry),
    ]
      .sort(compareCashEntriesDesc)
      .slice(skip, skip + limit);

    // Итоги — по всем источникам: общая сумма и разбивка по менеджерам кассы.
    // Выплаты мастерам и выплаты з/п входят со знаком минус (изъятие наличных из кассы).
    const totalSum =
      Number(dpSum._sum.amount ?? 0) +
      Number(cashSum._sum.amount ?? 0) -
      Number(salarySum[0]?.sum ?? 0) -
      Number(payoutSum._sum.amount ?? 0);
    const salaryByManager = salaryByManagerRaw.map((row) => ({
      managerId: row.managerId,
      _sum: { amount: -Number(row.sum ?? 0) },
    }));
    const payoutByManager = payoutByManagerRaw.map((row) => ({
      managerId: row.managerId,
      _sum: { amount: -Number(row._sum.amount ?? 0) },
    }));
    const sumByManagerId = new Map<string, number>();
    let noneManagerSum = 0;
    let hasNoneManager = false;
    for (const row of [
      ...dpByManagerRaw,
      ...cashByManagerRaw,
      ...salaryByManager,
      ...payoutByManager,
    ]) {
      const sum = Number(row._sum.amount ?? 0);
      if (!row.managerId) {
        hasNoneManager = true;
        noneManagerSum += sum;
        continue;
      }
      sumByManagerId.set(row.managerId, (sumByManagerId.get(row.managerId) ?? 0) + sum);
    }

    // Имена: справочник «Карточки менеджеров» (список «Все менеджеры» — как в ДП)
    // плюс участники кассы за период (имена плиток итогов).
    const nameUserIds = [...new Set([...directoryUserIds, ...sumByManagerId.keys()])];
    const nameUsers = nameUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: nameUserIds } },
          select: MANAGER_SELECT,
        })
      : [];
    const nameById = new Map(nameUsers.map((u) => [u.id, managerName(u)]));

    const byManager = [
      ...[...sumByManagerId.entries()].map(([managerId, sum]) => ({
        managerId,
        name: nameById.get(managerId) ?? managerId,
        sum,
      })),
      ...(hasNoneManager
        ? [{ managerId: '__none', name: 'Без менеджера', sum: noneManagerSum }]
        : []),
    ].sort((a, b) => b.sum - a.sum);

    // Список «Все менеджеры» — справочник карточек, как в фильтре ДП: не зависит
    // от фильтров и данных кассы. Удалённые пользователи не показываются.
    const managers = directoryUserIds
      .flatMap((id) => {
        const name = nameById.get(id);
        return name ? [{ id, name }] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      totalSum,
      byManager,
      managers,
      balance,
      openingBalance,
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
        kind: CASH_ENTRY_KIND_MANUAL,
        createdById: currentUserId,
      },
      include: ENTRY_INCLUDE,
    });
    return serializeCashBookEntry(row);
  }

  /**
   * Фиксация начального остатка кассы (центра): спец-запись kind = OPENING с датой
   * и фактической суммой наличных на эту дату. Запись одна — повторная фиксация
   * перезаписывает её (дату, сумму, комментарий). В обороты периода не входит,
   * в остатки на дату — входит; остатки пересчитываются автоматически.
   */
  async setOpeningBalance(dto: SetOpeningBalanceDto, currentUserId?: string) {
    const paymentDate = new Date(`${dto.date}T00:00:00.000Z`);
    if (
      Number.isNaN(paymentDate.getTime()) ||
      paymentDate.toISOString().slice(0, 10) !== dto.date
    ) {
      throw new BadRequestException('Указана несуществующая дата остатка');
    }
    const data = {
      paymentDate,
      performedAt: new Date(),
      amount: dto.amount,
      managerId: null,
      direction: null,
      contractNumber: null,
      customerName: null,
      executorName: null,
      basis: OPENING_BALANCE_BASIS,
      notes: dto.notes?.trim() || null,
      kind: CASH_ENTRY_KIND_OPENING,
      createdById: currentUserId ?? null,
    };
    const existing = await this.prisma.cashBookEntry.findFirst({
      where: { kind: CASH_ENTRY_KIND_OPENING },
    });
    const row = existing
      ? await this.prisma.cashBookEntry.update({
          where: { id: existing.id },
          data,
          include: ENTRY_INCLUDE,
        })
      : await this.prisma.cashBookEntry.create({ data, include: ENTRY_INCLUDE });
    return serializeOpeningBalance(row);
  }

  /** Удаление начального остатка: остатки снова считаются от нуля. */
  async deleteOpeningBalance() {
    const deleted = await this.prisma.cashBookEntry.deleteMany({
      where: { kind: CASH_ENTRY_KIND_OPENING },
    });
    return { deleted: deleted.count > 0 };
  }
}
