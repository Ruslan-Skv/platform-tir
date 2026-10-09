import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentForm, Prisma } from '@prisma/client';

import {
  DP_FURNITURE_DIRECTION,
  DP_MANUAL_DIRECTION_OTHER,
  MANUAL_MONEY_MOVEMENT_DIRECTIONS,
} from '../../common/config/package-direction-registry.config';
import { PrismaService } from '../../database/prisma.service';
import { MoneyMovementsService } from '../money-movements/money-movements.service';
import { CreateCashBookEntryDto } from './dto/create-cash-book-entry.dto';

const MANAGER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

const ENTRY_INCLUDE = {
  manager: { select: MANAGER_SELECT },
} satisfies Prisma.CashBookEntryInclude;

const MOVEMENT_INCLUDE = {
  manager: { select: MANAGER_SELECT },
} satisfies Prisma.MoneyMovementInclude;

type CashBookRowWithManager = Prisma.CashBookEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;
type MovementRowWithManager = Prisma.MoneyMovementGetPayload<{ include: typeof MOVEMENT_INCLUDE }>;

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
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
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
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Порядок журнала кассы: дата по убыванию, затем время и id — для стабильного
 *  слияния двух источников (записи кассы и наличные ДП). */
function compareCashEntriesDesc(a: SerializedCashEntry, b: SerializedCashEntry): number {
  if (a.paymentDate !== b.paymentDate) return a.paymentDate < b.paymentDate ? 1 : -1;
  if (a.performedAt !== b.performedAt) return a.performedAt < b.performedAt ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/** Раздел «Касса»: свёрнутые наличные оплаты ДП + собственные ручные записи кассы. */
@Injectable()
export class CashBookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moneyMovements: MoneyMovementsService,
  ) {}

  /**
   * Записи кассы за период: наличные оплаты журнала ДП, отмеченные сверёнными
   * супер-админом (золотая печать), + собственные ручные записи кассы.
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
      ...(searchFilter ?? {}),
    };
    const cashWhere: Prisma.CashBookEntryWhereInput = {
      ...(periodFilter ?? {}),
      ...(managerFilter ?? {}),
      ...(searchFilter ?? {}),
    };

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
      this.prisma.cashBookEntry.aggregate({ where: cashWhere, _sum: { amount: true } }),
      this.prisma.moneyMovement.groupBy({
        by: ['managerId'],
        where: dpWhere,
        _sum: { amount: true },
      }),
      this.prisma.cashBookEntry.groupBy({
        by: ['managerId'],
        where: cashWhere,
        _sum: { amount: true },
      }),
      this.moneyMovements.getSignatoryProfileUserIds(),
    ]);

    const total = dpTotal + cashTotal;

    const rows = [
      ...dpRows.map(serializeMovementAsCashEntry),
      ...cashRows.map(serializeCashBookEntry),
    ]
      .sort(compareCashEntriesDesc)
      .slice(skip, skip + limit);

    // Итоги — по обоим источникам: общая сумма и разбивка по менеджерам кассы.
    const totalSum = Number(dpSum._sum.amount ?? 0) + Number(cashSum._sum.amount ?? 0);
    const sumByManagerId = new Map<string, number>();
    let noneManagerSum = 0;
    let hasNoneManager = false;
    for (const row of [...dpByManagerRaw, ...cashByManagerRaw]) {
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
