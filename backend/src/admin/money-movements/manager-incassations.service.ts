import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PaymentForm, PaymentType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateManagerIncassationDto } from './dto/create-manager-incassation.dto';
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
   * Наличные менеджера с момента последней инкассации до текущего момента:
   * наличные оплаты минус наличные возвраты (в журнале возвраты хранятся положительной суммой).
   */
  async getIncassationCashBalance(managerId: string) {
    const [last, manager] = await Promise.all([
      this.prisma.managerIncassation.findFirst({
        where: { managerId },
        orderBy: { performedAt: 'desc' },
        select: { performedAt: true, amount: true, incassator: true },
      }),
      this.prisma.user.findUnique({
        where: { id: managerId },
        select: { email: true, firstName: true, lastName: true },
      }),
    ]);

    const movements = await this.prisma.moneyMovement.findMany({
      where: {
        managerId,
        paymentForm: PaymentForm.CASH,
        deletedAt: null,
        ...(last ? { performedAt: { gt: last.performedAt } } : {}),
      },
      select: { amount: true, paymentType: true },
    });

    const balance = movements.reduce(
      (sum, m) => sum.plus(m.paymentType === PaymentType.REFUND ? m.amount.neg() : m.amount),
      new Prisma.Decimal(0),
    );

    return {
      managerId,
      managerName: userName(manager),
      balance: balance.toString(),
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
   * та же логика, что у getIncassationCashBalance, — наличные оплаты минус наличные
   * возвраты с момента последней инкассации каждого менеджера до текущего момента.
   */
  async getCashBalances(managerIds: string[]): Promise<Map<string, Prisma.Decimal>> {
    const balances = new Map<string, Prisma.Decimal>(
      managerIds.map((id) => [id, new Prisma.Decimal(0)]),
    );
    if (managerIds.length === 0) return balances;

    const [lastIncassations, movements] = await Promise.all([
      this.prisma.managerIncassation.groupBy({
        by: ['managerId'],
        where: { managerId: { in: managerIds } },
        _max: { performedAt: true },
      }),
      this.prisma.moneyMovement.findMany({
        // Удалённые в корзину записи кассу менеджера не пополняют.
        where: { managerId: { in: managerIds }, paymentForm: PaymentForm.CASH, deletedAt: null },
        select: { managerId: true, amount: true, paymentType: true, performedAt: true },
      }),
    ]);

    const lastByManager = new Map(
      lastIncassations
        .filter((row) => row._max.performedAt)
        .map((row) => [row.managerId, row._max.performedAt as Date]),
    );

    for (const movement of movements) {
      if (!movement.managerId) continue;
      const last = lastByManager.get(movement.managerId);
      if (last && movement.performedAt <= last) continue;
      const delta =
        movement.paymentType === PaymentType.REFUND ? movement.amount.neg() : movement.amount;
      balances.set(
        movement.managerId,
        (balances.get(movement.managerId) ?? new Prisma.Decimal(0)).plus(delta),
      );
    }
    return balances;
  }

  /**
   * Создаёт запись инкассации. Менеджер, сдающий инкассацию, — выбранный в форме
   * (по умолчанию текущий пользователь); запись фиксирует текущий пользователь (createdById).
   * Если инкассация сдаётся за другого менеджера (onBehalfOfId), остаток наличных
   * закрывается по кассе этого менеджера, а сдающий фиксируется в submitterId.
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
    return records.map((record) => this.serializeIncassation(record));
  }

  private serializeIncassation(row: IncassationWithManager) {
    return {
      id: row.id,
      performedAt: row.performedAt.toISOString(),
      amount: row.amount.toString(),
      incassator: row.incassator,
      notes: row.notes,
      manager: row.manager ? { id: row.manager.id, name: userName(row.manager) } : null,
      submitter: row.submitter ? { id: row.submitter.id, name: userName(row.submitter) } : null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
