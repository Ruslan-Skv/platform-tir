import { BadRequestException, Injectable } from '@nestjs/common';
import { ContractDocumentPackageKind, PaymentForm, Prisma } from '@prisma/client';

import {
  DP_FURNITURE_DIRECTION,
  DP_MANUAL_DIRECTION_OTHER,
  MANUAL_MONEY_MOVEMENT_DIRECTIONS,
  PACKAGE_DIRECTION_REGISTRY,
} from '../../common/config/package-direction-registry.config';
import { PrismaService } from '../../database/prisma.service';
import { SALARY_PAYOUT_BASIS } from '../../common/constants/salary-payout';
import { MoneyMovementsService } from '../money-movements/money-movements.service';
import { CreateCashBookEntryDto } from './dto/create-cash-book-entry.dto';
import { SetOpeningBalanceDto } from './dto/set-opening-balance.dto';

const MANAGER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

/** Тип записи кассы: MANUAL — ручная проводка, OPENING — начальный остаток. */
const CASH_ENTRY_KIND_MANUAL = 'MANUAL';
const CASH_ENTRY_KIND_OPENING = 'OPENING';

/** Основание спец-записи начального остатка кассы. */
const OPENING_BALANCE_BASIS = 'Начальный остаток';

const KIND_TO_DIRECTION_NAME = Object.fromEntries(
  PACKAGE_DIRECTION_REGISTRY.map((d) => [d.kind, d.name]),
) as Record<ContractDocumentPackageKind, string>;

/** Экранирование спецсимволов ILIKE (% _ \) в поисковом запросе. */
function escapeLike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

const ENTRY_INCLUDE = {
  manager: { select: MANAGER_SELECT },
} satisfies Prisma.CashBookEntryInclude;

const MOVEMENT_INCLUDE = {
  manager: { select: MANAGER_SELECT },
} satisfies Prisma.MoneyMovementInclude;

const PAYOUT_INCLUDE = {
  manager: { select: MANAGER_SELECT },
  createdBy: { select: MANAGER_SELECT },
} satisfies Prisma.SalaryPayoutInclude;

type CashBookRowWithManager = Prisma.CashBookEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;
type MovementRowWithManager = Prisma.MoneyMovementGetPayload<{ include: typeof MOVEMENT_INCLUDE }>;
type PayoutRowWithUsers = Prisma.SalaryPayoutGetPayload<{ include: typeof PAYOUT_INCLUDE }>;

/** Строка журнала выплат мастерам (сырой SQL): реквизиты договора достаём из formData пакета. */
type SalaryAdvanceRawRow = {
  id: string;
  installerLiveName: string | null;
  installerName: string | null;
  paidAt: Date;
  amount: Prisma.Decimal | number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  createdByFirstName: string | null;
  createdByLastName: string | null;
  createdByEmail: string | null;
  packageKind: ContractDocumentPackageKind;
  contractNumber: string | null;
  customerName: string | null;
};

/** Общий вид записи кассы на клиенте: записи кассы и наличные ДП сериализуются одинаково. */
type SerializedCashEntry = ReturnType<typeof serializeCashBookEntry>;

function managerName(user: { email: string; firstName: string | null; lastName: string | null }) {
  return [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email;
}

/** Поиск по текстовым полям — поля совпадают у записей кассы и движений ДП. */
function cashSearchFilter(search: string) {
  return {
    OR: [
      { contractNumber: { contains: search, mode: 'insensitive' as const } },
      { customerName: { contains: search, mode: 'insensitive' as const } },
      { basis: { contains: search, mode: 'insensitive' as const } },
      { notes: { contains: search, mode: 'insensitive' as const } },
    ],
  };
}

/** Поиск по полям движений ДП — как в кассе, плюс получатель зар/платы записи «Зар/плата». */
function movementSearchFilter(search: string): Prisma.MoneyMovementWhereInput {
  return {
    OR: [
      { contractNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { basis: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { salaryRecipientName: { contains: search, mode: 'insensitive' } },
    ],
  };
}

/** Форма записи кассы для клиента (задаёт тип SerializedCashEntry). */
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
    kind: row.kind,
    salaryRecipientName: null as string | null,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Начальный остаток кассы для клиента: якорь, от которого считаются остатки. */
function serializeOpeningBalance(row: CashBookRowWithManager) {
  return {
    id: row.id,
    date: row.paymentDate.toISOString().slice(0, 10),
    amount: Number(row.amount),
    notes: row.notes,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Наличная оплата ДП в форме записи кассы — те же поля, что у записи кассы. */
function serializeMovementAsCashEntry(row: MovementRowWithManager): SerializedCashEntry {
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
    kind: CASH_ENTRY_KIND_MANUAL,
    /** Получатель зар/платы свёрнутой записи ДП с основанием «Зар/плата». */
    salaryRecipientName: row.salaryRecipientName ?? null,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Выплата мастеру наличными в форме записи кассы: сумма — со знаком минус
 *  (изъятие из кассы), основание — «Зар/плата», в колонке зар/платы — ФИО мастера. */
function serializeSalaryAdvanceAsCashEntry(row: SalaryAdvanceRawRow): SerializedCashEntry {
  const createdBy = [row.createdByLastName, row.createdByFirstName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const managerNameValue = createdBy || row.createdByEmail || null;
  return {
    id: row.id,
    paymentDate: row.paidAt.toISOString().slice(0, 10),
    performedAt: row.createdAt.toISOString(),
    amount: new Prisma.Decimal(row.amount).neg().toString(),
    manager:
      row.createdById && managerNameValue ? { id: row.createdById, name: managerNameValue } : null,
    direction: KIND_TO_DIRECTION_NAME[row.packageKind] ?? String(row.packageKind),
    contractNumber: row.contractNumber,
    customerName: row.customerName,
    executorName: null,
    basis: SALARY_PAYOUT_BASIS,
    notes: row.note,
    kind: CASH_ENTRY_KIND_MANUAL,
    salaryRecipientName: row.installerLiveName ?? row.installerName,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Выплата з/п из раздела «Выплаты з/п» в форме записи кассы: сумма — со знаком
 *  минус (изъятие наличных), основание — «Зар/плата», в колонке зар/платы — ФИО
 *  получателя. Менеджер кассы — кто выдал (менеджер или автор записи выплаты). */
function serializeSalaryPayoutAsCashEntry(row: PayoutRowWithUsers): SerializedCashEntry {
  const manager = row.manager ?? row.createdBy;
  return {
    id: row.id,
    paymentDate: row.paidAt.toISOString().slice(0, 10),
    performedAt: row.createdAt.toISOString(),
    amount: row.amount.neg().toString(),
    manager: manager ? { id: manager.id, name: managerName(manager) } : null,
    direction: null,
    contractNumber: null,
    customerName: null,
    executorName: null,
    basis: SALARY_PAYOUT_BASIS,
    notes: row.note,
    kind: CASH_ENTRY_KIND_MANUAL,
    salaryRecipientName: row.recipientName,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Порядок журнала кассы: дата по убыванию, затем время и id — для стабильного
 *  слияния источников (записи кассы, наличные ДП и выплаты мастерам). */
function compareCashEntriesDesc(a: SerializedCashEntry, b: SerializedCashEntry): number {
  if (a.paymentDate !== b.paymentDate) return a.paymentDate < b.paymentDate ? 1 : -1;
  if (a.performedAt !== b.performedAt) return a.performedAt < b.performedAt ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/** Раздел «Касса»: свёрнутые наличные оплаты ДП + собственные ручные записи кассы
 *  + выплаты мастерам наличными из расчётов (зар/плата, сумма со знаком минус)
 *  + наличные выплаты з/п из раздела «Выплаты з/п» (проекция, со знаком минус). */
@Injectable()
export class CashBookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moneyMovements: MoneyMovementsService,
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

    // Остатки кассы: только границы периода, без фильтров менеджера и поиска —
    // фильтры не должны искажать остаток. Все источники, включая начальный
    // остаток (он лежит в cash_book_entries с kind = OPENING).
    const beforeFilter = params.dateFrom
      ? { paymentDate: { lt: new Date(params.dateFrom) } }
      : undefined;
    const toEndFilter = params.dateTo
      ? { paymentDate: { lte: new Date(`${params.dateTo}T23:59:59.999`) } }
      : undefined;
    const payoutBeforeFilter = params.dateFrom
      ? { paidAt: { lt: new Date(params.dateFrom) } }
      : undefined;
    const payoutToEndFilter = params.dateTo
      ? { paidAt: { lte: new Date(`${params.dateTo}T23:59:59.999`) } }
      : undefined;
    const dpBalanceBase: Prisma.MoneyMovementWhereInput = {
      deletedAt: null,
      paymentForm: PaymentForm.CASH,
      manualReconciledAt: { not: null },
    };
    const advanceBalanceFrom = Prisma.sql`
      FROM contract_document_package_installer_advances a
      JOIN contract_document_packages p ON p."id" = a."packageId"
      WHERE p."deleted_at" IS NULL AND a."paymentMethod" = 'CASH'`;
    const payoutBalanceBase: Prisma.SalaryPayoutWhereInput = {
      deletedAt: null,
      paymentMethod: 'CASH',
    };
    const [
      openingRow,
      dpSumBefore,
      dpSumToEnd,
      dpSumPosInPeriod,
      dpSumNegInPeriod,
      cashSumBefore,
      cashSumToEnd,
      cashSumPosInPeriod,
      cashSumNegInPeriod,
      advanceSumBefore,
      advanceSumToEnd,
      advanceSumInPeriod,
      payoutSumBefore,
      payoutSumToEnd,
      payoutSumInPeriod,
    ] = await Promise.all([
      this.prisma.cashBookEntry.findFirst({
        where: { kind: CASH_ENTRY_KIND_OPENING },
        include: ENTRY_INCLUDE,
      }),
      this.prisma.moneyMovement.aggregate({
        where: { ...dpBalanceBase, ...(beforeFilter ?? {}) },
        _sum: { amount: true },
      }),
      this.prisma.moneyMovement.aggregate({
        where: { ...dpBalanceBase, ...(toEndFilter ?? {}) },
        _sum: { amount: true },
      }),
      this.prisma.moneyMovement.aggregate({
        where: { ...dpBalanceBase, ...(periodFilter ?? {}), amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.moneyMovement.aggregate({
        where: { ...dpBalanceBase, ...(periodFilter ?? {}), amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.cashBookEntry.aggregate({
        where: beforeFilter ?? {},
        _sum: { amount: true },
      }),
      this.prisma.cashBookEntry.aggregate({
        where: toEndFilter ?? {},
        _sum: { amount: true },
      }),
      this.prisma.cashBookEntry.aggregate({
        where: { kind: CASH_ENTRY_KIND_MANUAL, ...(periodFilter ?? {}), amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.cashBookEntry.aggregate({
        where: { kind: CASH_ENTRY_KIND_MANUAL, ...(periodFilter ?? {}), amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      params.dateFrom
        ? this.prisma.$queryRaw<Array<{ sum: Prisma.Decimal | number }>>(
            Prisma.sql`SELECT COALESCE(SUM(a."amount"), 0) AS "sum"${advanceBalanceFrom} AND a."paidAt" < ${params.dateFrom}::date`,
          )
        : Promise.resolve([{ sum: 0 }]),
      params.dateTo
        ? this.prisma.$queryRaw<Array<{ sum: Prisma.Decimal | number }>>(
            Prisma.sql`SELECT COALESCE(SUM(a."amount"), 0) AS "sum"${advanceBalanceFrom} AND a."paidAt" <= ${params.dateTo}::date`,
          )
        : this.prisma.$queryRaw<Array<{ sum: Prisma.Decimal | number }>>(
            Prisma.sql`SELECT COALESCE(SUM(a."amount"), 0) AS "sum"${advanceBalanceFrom}`,
          ),
      this.prisma.$queryRaw<Array<{ sum: Prisma.Decimal | number }>>(
        Prisma.sql`SELECT COALESCE(SUM(a."amount"), 0) AS "sum"${advanceBalanceFrom}${
          params.dateFrom ? Prisma.sql` AND a."paidAt" >= ${params.dateFrom}::date` : Prisma.empty
        }${params.dateTo ? Prisma.sql` AND a."paidAt" <= ${params.dateTo}::date` : Prisma.empty}`,
      ),
      this.prisma.salaryPayout.aggregate({
        where: { ...payoutBalanceBase, ...(payoutBeforeFilter ?? {}) },
        _sum: { amount: true },
      }),
      this.prisma.salaryPayout.aggregate({
        where: { ...payoutBalanceBase, ...(payoutToEndFilter ?? {}) },
        _sum: { amount: true },
      }),
      this.prisma.salaryPayout.aggregate({
        where: { ...payoutBalanceBase, ...(payoutPeriodFilter ?? {}) },
        _sum: { amount: true },
      }),
    ]);

    // Начальный остаток внутри периода учитывается отдельной строкой, чтобы
    // сходилась арифметика: начало + нач. остаток + приход − расход = конец.
    const openingInPeriod =
      openingRow &&
      (!params.dateFrom || openingRow.paymentDate >= new Date(params.dateFrom)) &&
      (!params.dateTo || openingRow.paymentDate <= new Date(`${params.dateTo}T23:59:59.999`))
        ? Number(openingRow.amount)
        : 0;
    const balance = {
      start:
        Number(dpSumBefore._sum.amount ?? 0) +
        Number(cashSumBefore._sum.amount ?? 0) -
        Number(advanceSumBefore[0]?.sum ?? 0) -
        Number(payoutSumBefore._sum.amount ?? 0),
      end:
        Number(dpSumToEnd._sum.amount ?? 0) +
        Number(cashSumToEnd._sum.amount ?? 0) -
        Number(advanceSumToEnd[0]?.sum ?? 0) -
        Number(payoutSumToEnd._sum.amount ?? 0),
      income:
        Number(dpSumPosInPeriod._sum.amount ?? 0) + Number(cashSumPosInPeriod._sum.amount ?? 0),
      expense:
        Math.abs(Number(dpSumNegInPeriod._sum.amount ?? 0)) +
        Math.abs(Number(cashSumNegInPeriod._sum.amount ?? 0)) +
        Number(advanceSumInPeriod[0]?.sum ?? 0) +
        Number(payoutSumInPeriod._sum.amount ?? 0),
      openingInPeriod,
    };

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
      openingBalance: openingRow ? serializeOpeningBalance(openingRow) : null,
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
