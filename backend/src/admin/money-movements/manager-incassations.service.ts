import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentForm, PaymentType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CreateManagerIncassationDto,
  UpdateManagerIncassationDto,
} from './dto/create-manager-incassation.dto';
import { IncassationNotifyService } from './incassation-notify.service';

const INCASSATION_MANAGER_INCLUDE = {
  manager: { select: { id: true, email: true, firstName: true, lastName: true } },
  submitter: { select: { id: true, email: true, firstName: true, lastName: true } },
} satisfies Prisma.ManagerIncassationInclude;

type IncassationWithManager = Prisma.ManagerIncassationGetPayload<{
  include: typeof INCASSATION_MANAGER_INCLUDE;
}>;

function userName(
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null,
): string | null {
  return user
    ? [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email
    : null;
}

/** Инкассации наличных менеджеров: остаток кассы, записи и история (страница ДП). */
@Injectable()
export class ManagerIncassationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incassationNotify: IncassationNotifyService,
  ) {}

  /**
   * Остаток наличных менеджера (приходно-расходная модель): все наличные оплаты
   * и проводки минус наличные возвраты минус все сданные инкассации. Момент
   * внесения записей не важен: оплаты задним числом и правки лишь меняют
   * текущий остаток, а инкассация уменьшает его ровно на сданную сумму —
   * недосдача не «списывается», а остаётся в остатке.
   */
  async getIncassationCashBalance(managerId: string) {
    const [last, manager, ledger] = await Promise.all([
      this.prisma.managerIncassation.findFirst({
        where: { managerId },
        orderBy: { performedAt: 'desc' },
        select: { performedAt: true, amount: true, incassator: true },
      }),
      this.prisma.user.findUnique({
        where: { id: managerId },
        select: { email: true, firstName: true, lastName: true },
      }),
      this.cashLedger(managerId),
    ]);

    return {
      managerId,
      managerName: userName(manager),
      payments: ledger.payments.toString(),
      refunds: ledger.refunds.toString(),
      incassated: ledger.incassated.toString(),
      balance: ledger.balance.toString(),
      lastIncassation: last
        ? {
            performedAt: last.performedAt.toISOString(),
            amount: last.amount.toString(),
            incassator: last.incassator,
          }
        : null,
    };
  }

  /**
   * Наличные к инкассации сразу для списка менеджеров (плитки итогов журнала ДП):
   * та же приходно-расходная модель, что у getIncassationCashBalance — оплаты
   * минус возвраты минус все инкассации каждого менеджера.
   */
  async getCashBalances(managerIds: string[]): Promise<Map<string, Prisma.Decimal>> {
    const balances = new Map<string, Prisma.Decimal>(
      managerIds.map((id) => [id, new Prisma.Decimal(0)]),
    );
    if (managerIds.length === 0) return balances;

    // Удалённые в корзину записи кассу менеджера не пополняют.
    const [paymentRows, refundRows, incassationRows] = await Promise.all([
      this.prisma.moneyMovement.groupBy({
        by: ['managerId'],
        where: {
          managerId: { in: managerIds },
          paymentForm: PaymentForm.CASH,
          deletedAt: null,
          paymentType: { not: PaymentType.REFUND },
        },
        _sum: { amount: true },
      }),
      this.prisma.moneyMovement.groupBy({
        by: ['managerId'],
        where: {
          managerId: { in: managerIds },
          paymentForm: PaymentForm.CASH,
          deletedAt: null,
          paymentType: PaymentType.REFUND,
        },
        _sum: { amount: true },
      }),
      this.prisma.managerIncassation.groupBy({
        by: ['managerId'],
        where: { managerId: { in: managerIds } },
        _sum: { amount: true },
      }),
    ]);

    // Возвраты хранятся положительной суммой, инкассации — тоже: вычитаем их из кассы.
    const apply = (
      rows: { managerId: string | null; _sum: { amount: Prisma.Decimal | null } }[],
      sign: 1 | -1,
    ) => {
      for (const row of rows) {
        const id = row.managerId;
        if (!id) continue;
        const current = balances.get(id);
        if (current === undefined) continue;
        balances.set(id, current.plus((row._sum.amount ?? new Prisma.Decimal(0)).mul(sign)));
      }
    };
    apply(paymentRows, 1);
    apply(refundRows, -1);
    apply(incassationRows, -1);
    return balances;
  }

  /**
   * Слагаемые кассы менеджера: оплаты и ручные проводки (изъятия — отрицательной
   * суммой), возвраты (положительной) и все инкассации. Остаток = оплаты −
   * возвраты − инкассации.
   */
  private async cashLedger(managerId: string) {
    const [paymentAgg, refundAgg, incassationAgg] = await Promise.all([
      this.prisma.moneyMovement.aggregate({
        where: {
          managerId,
          paymentForm: PaymentForm.CASH,
          deletedAt: null,
          paymentType: { not: PaymentType.REFUND },
        },
        _sum: { amount: true },
      }),
      this.prisma.moneyMovement.aggregate({
        where: {
          managerId,
          paymentForm: PaymentForm.CASH,
          deletedAt: null,
          paymentType: PaymentType.REFUND,
        },
        _sum: { amount: true },
      }),
      this.prisma.managerIncassation.aggregate({
        where: { managerId },
        _sum: { amount: true },
      }),
    ]);

    const payments = paymentAgg._sum.amount ?? new Prisma.Decimal(0);
    const refunds = refundAgg._sum.amount ?? new Prisma.Decimal(0);
    const incassated = incassationAgg._sum.amount ?? new Prisma.Decimal(0);
    return { payments, refunds, incassated, balance: payments.minus(refunds).minus(incassated) };
  }

  /**
   * Создаёт запись инкассации. Менеджер, сдающий инкассацию, — выбранный в форме
   * (по умолчанию текущий пользователь); запись фиксирует текущий пользователь (createdById).
   * Если инкассация сдаётся за другого менеджера (onBehalfOfId), сумма вычитается
   * из кассы этого менеджера, а сдающий фиксируется в submitterId.
   */
  async createIncassation(dto: CreateManagerIncassationDto, currentUserId?: string) {
    if (!currentUserId) throw new UnauthorizedException('Пользователь не определён');

    const submitterId = dto.managerId?.trim() || currentUserId;
    const managerId = dto.onBehalfOfId?.trim() || submitterId;

    const [managerExists, submitterExists] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: managerId }, select: { id: true } }),
      managerId === submitterId
        ? Promise.resolve(true)
        : this.prisma.user.findUnique({ where: { id: submitterId }, select: { id: true } }),
    ]);
    if (!managerExists) throw new BadRequestException('Указанный менеджер не найден');
    if (!submitterExists) throw new BadRequestException('Указанный сдающий менеджер не найден');

    // Сдача, отличающаяся от остатка кассы, — всегда значимое событие (частичная
    // сдача, излишек): причину фиксируем примечанием, иначе расхождение потеряется.
    const ledger = await this.cashLedger(managerId);
    const differsFromBalance = new Prisma.Decimal(dto.amount)
      .minus(ledger.balance)
      .abs()
      .gte('0.01');
    if (differsFromBalance && !dto.notes?.trim()) {
      throw new BadRequestException(
        `Сумма инкассации (${dto.amount} ₽) отличается от остатка наличных (${ledger.balance.toString()} ₽): укажите причину расхождения в примечании`,
      );
    }

    const record = await this.prisma.managerIncassation.create({
      data: {
        managerId,
        submitterId: submitterId === managerId ? null : submitterId,
        amount: dto.amount,
        incassator: dto.incassator.trim(),
        // Инкассация фиксируется моментом записи: остаток кассы отсекается по
        // серверному времени, а не по выбираемой пользователем дате.
        performedAt: new Date(),
        notes: dto.notes?.trim() || null,
        createdById: currentUserId,
      },
      include: INCASSATION_MANAGER_INCLUDE,
    });

    // Уведомления (колокольчик + браузерные push) менеджеру кассы и сдающему — fire-and-forget.
    this.incassationNotify.onCreated(
      {
        id: record.id,
        managerId,
        submitterId: record.submitterId,
        managerName: userName(record.manager),
        submitterName: userName(record.submitter),
        amount: Number(record.amount),
        incassator: record.incassator,
      },
      currentUserId,
    );

    return this.serializeIncassation(record);
  }

  /** Последние инкассации (для панели истории на странице ДП). */
  async listIncassations(limit = 50) {
    const records = await this.prisma.managerIncassation.findMany({
      orderBy: [{ performedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 100),
      include: INCASSATION_MANAGER_INCLUDE,
    });
    const balancesAfter = await this.cashBalancesAfter(records);
    return records.map((record) =>
      this.serializeIncassation(record, balancesAfter.get(record.id) ?? null),
    );
  }

  /**
   * Остаток кассы на момент сразу после каждой инкассации списка: та же
   * приходно-расходная модель, что у cashLedger, но срезом на performedAt
   * записи — оплаты и проводки минус возвраты минус инкассации, проведённые
   * не позже этой. Касса считается по менеджеру самой записи; позже внесённые
   * задним числом оплаты исторический остаток не меняют — они попадают только
   * в текущий.
   */
  private async cashBalancesAfter(
    records: { id: string; managerId: string; performedAt: Date }[],
  ): Promise<Map<string, Prisma.Decimal>> {
    const balances = new Map<string, Prisma.Decimal>();
    if (records.length === 0) return balances;

    const managerIds = [...new Set(records.map((record) => record.managerId))];
    // Самая поздняя инкассация списка — верхняя граница выборки событий кассы.
    const cutoff = records.reduce(
      (latest, record) => (record.performedAt > latest ? record.performedAt : latest),
      records[0].performedAt,
    );

    const [movements, incassations] = await Promise.all([
      this.prisma.moneyMovement.findMany({
        where: {
          managerId: { in: managerIds },
          paymentForm: PaymentForm.CASH,
          deletedAt: null,
          performedAt: { lte: cutoff },
        },
        select: { managerId: true, paymentType: true, amount: true, performedAt: true },
      }),
      this.prisma.managerIncassation.findMany({
        where: { managerId: { in: managerIds }, performedAt: { lte: cutoff } },
        select: { managerId: true, amount: true, performedAt: true },
      }),
    ]);

    // События кассы по менеджеру: возвраты и инкассации входят со знаком минуса
    // (хранятся положительной суммой), изъятия уже отрицательны.
    const eventsByManager = new Map<string, { at: Date; amount: Prisma.Decimal }[]>();
    const pushEvent = (managerId: string | null, at: Date, amount: Prisma.Decimal) => {
      if (!managerId) return;
      const events = eventsByManager.get(managerId);
      if (events) events.push({ at, amount });
      else eventsByManager.set(managerId, [{ at, amount }]);
    };
    for (const movement of movements) {
      pushEvent(
        movement.managerId,
        movement.performedAt,
        movement.paymentType === PaymentType.REFUND ? movement.amount.neg() : movement.amount,
      );
    }
    for (const incassation of incassations) {
      pushEvent(incassation.managerId, incassation.performedAt, incassation.amount.neg());
    }
    for (const events of eventsByManager.values()) {
      events.sort((a, b) => a.at.getTime() - b.at.getTime());
    }

    // Нарастающий итог по времени: сумма событий кассы менеджера до performedAt
    // записи включительно — остаток сразу после неё.
    const byTimeAsc = [...records].sort(
      (a, b) => a.performedAt.getTime() - b.performedAt.getTime(),
    );
    for (const managerId of managerIds) {
      const events = eventsByManager.get(managerId) ?? [];
      let balance = new Prisma.Decimal(0);
      let index = 0;
      for (const record of byTimeAsc) {
        if (record.managerId !== managerId) continue;
        while (index < events.length && events[index].at <= record.performedAt) {
          balance = balance.plus(events[index].amount);
          index += 1;
        }
        balances.set(record.id, balance);
      }
    }

    return balances;
  }

  /**
   * Правка инкассации — только супер-админ: исправление ошибочной суммы, ФИО
   * инкассатора или примечания. Дата и менеджеры не меняются — для этого запись
   * аннулируется и создаётся заново.
   */
  async updateIncassation(id: string, dto: UpdateManagerIncassationDto) {
    const existing = await this.prisma.managerIncassation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Запись инкассации не найдена');

    const row = await this.prisma.managerIncassation.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.incassator !== undefined ? { incassator: dto.incassator.trim() } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
      },
      include: INCASSATION_MANAGER_INCLUDE,
    });
    return this.serializeIncassation(row);
  }

  /**
   * Аннулирование ошибочной инкассации — только супер-админ: запись удаляется,
   * сданная сумма возвращается в остаток кассы менеджера.
   */
  async deleteIncassation(id: string) {
    const existing = await this.prisma.managerIncassation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Запись инкассации не найдена');

    await this.prisma.managerIncassation.delete({ where: { id } });
    return { ok: true };
  }

  private serializeIncassation(
    row: IncassationWithManager,
    cashBalanceAfter?: Prisma.Decimal | null,
  ) {
    return {
      id: row.id,
      performedAt: row.performedAt.toISOString(),
      amount: row.amount.toString(),
      incassator: row.incassator,
      notes: row.notes,
      manager: row.manager ? { id: row.manager.id, name: userName(row.manager) } : null,
      submitter: row.submitter ? { id: row.submitter.id, name: userName(row.submitter) } : null,
      createdAt: row.createdAt.toISOString(),
      // null — остаток не считался (создание и правка записи, вне истории ДП).
      cashBalanceAfter: cashBalanceAfter ? cashBalanceAfter.toString() : null,
    };
  }
}
