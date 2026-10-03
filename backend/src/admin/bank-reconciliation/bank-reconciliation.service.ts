import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BankEntryType, PaymentForm, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

/** Сопоставление способов оплаты ДП с типами зачислений банка. Наличные не сверяются. */
const PAYMENT_FORM_TO_ENTRY_TYPE: Partial<Record<PaymentForm, BankEntryType>> = {
  TERMINAL: 'TERMINAL_QR',
  QR: 'TERMINAL_QR',
  INVOICE: 'INVOICE_PAYMENT',
  LC_TRANSFER: 'LC_TRANSFER',
  BANK_APP: 'TERMINAL_QR',
};

const RECONCILABLE_FORMS = Object.keys(PAYMENT_FORM_TO_ENTRY_TYPE) as PaymentForm[];

const MANAGER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

const MOVEMENT_INCLUDE = {
  manager: { select: MANAGER_SELECT },
} as const;

type MovementRow = Prisma.MoneyMovementGetPayload<{ include: typeof MOVEMENT_INCLUDE }>;

function movementName(
  user: { email: string; firstName: string | null; lastName: string | null } | null,
) {
  return user
    ? [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email
    : null;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function toNumber(value: Prisma.Decimal | null | undefined): number {
  return value ? value.toNumber() : 0;
}

/** Краткая форма оплаты ДП для экрана сверки. */
function serializeMovement(row: MovementRow, linkedAmount: number) {
  const amount = row.amount.toNumber();
  return {
    id: row.id,
    paymentDate: isoDate(row.paymentDate),
    amount: row.amount.toString(),
    paymentForm: row.paymentForm,
    contractNumber: row.contractNumber,
    customerName: row.customerName,
    managerName: movementName(row.manager),
    /** Сколько суммы оплаты уже зафиксировано связями. */
    linkedAmount: linkedAmount.toFixed(2),
    /** Остаток оплаты, не покрытый поступлениями. */
    remainder: Math.max(0, amount - linkedAmount).toFixed(2),
  };
}

@Injectable()
export class BankReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Сверка за период: поступления банка с покрытием зафиксированными связями,
   * авто-предложения сопоставления (лаг + групповые зачисления) и оплаты ДП
   * без поступления (в т.ч. «в пути» — лаг ещё не истёк).
   */
  async preview(params: { dateFrom: string; dateTo: string; lagDays?: number }) {
    const { dateFrom, dateTo } = params;
    const lagDays = Math.min(Math.max(params.lagDays ?? 3, 0), 14);

    const bankWhere: Prisma.BankEntryWhereInput = {
      entryDate: { gte: new Date(dateFrom), lte: new Date(dateTo) },
    };
    const [bankEntries, dpMovements] = await Promise.all([
      this.prisma.bankEntry.findMany({
        where: bankWhere,
        include: {
          createdBy: { select: MANAGER_SELECT },
          bankReconciliationLinks: { include: { moneyMovement: { include: MOVEMENT_INCLUDE } } },
        },
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
      }),
      // Оплаты для матчинга грузим с запасом на лаг до начала периода: зачисление
      // 1-го числа может покрывать оплату последних дней предыдущего периода.
      // Участвуют и авто-записи, и ручные проводки — не сверяются только наличные
      // (CASH): они сдаются инкассацией и на расчётный счёт напрямую не приходят.
      this.prisma.moneyMovement.findMany({
        where: {
          deletedAt: null,
          paymentForm: { in: RECONCILABLE_FORMS },
          amount: { gt: 0 },
          paymentDate: { gte: new Date(addDays(dateFrom, -(lagDays + 1))), lte: new Date(dateTo) },
        },
        include: { ...MOVEMENT_INCLUDE, bankReconciliationLinks: true },
        orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    // Остатки оплат по всем их связям (в т.ч. созданным раньше периода сверки).
    const movementIds = dpMovements.map((m) => m.id);
    const extraLinks = movementIds.length
      ? await this.prisma.bankReconciliationLink.findMany({
          where: { moneyMovementId: { in: movementIds } },
          select: { moneyMovementId: true, amount: true },
        })
      : [];
    const linkedByMovement = new Map<string, number>();
    for (const link of extraLinks) {
      linkedByMovement.set(
        link.moneyMovementId,
        (linkedByMovement.get(link.moneyMovementId) ?? 0) + link.amount.toNumber(),
      );
    }

    // Живое состояние оплат: остаток и признак полной покрытия.
    type MovementState = {
      row: MovementRow;
      linkedAmount: number;
      remainder: number;
    };
    const movementStates = new Map<string, MovementState>();
    for (const row of dpMovements) {
      const linkedAmount = linkedByMovement.get(row.id) ?? 0;
      // Оплата со связью «с расхождением» считается закрытой целиком: её
      // непокрытый «хвост» от округления не должен висеть в «без поступления» —
      // расхождение показывается в строке самого поступления.
      const hasMismatch = row.bankReconciliationLinks.some(
        (l) => (l.mismatchAmount?.toNumber() ?? 0) > 0,
      );
      movementStates.set(row.id, {
        row,
        linkedAmount: hasMismatch ? row.amount.toNumber() : linkedAmount,
        remainder: hasMismatch ? 0 : row.amount.toNumber() - linkedAmount,
      });
    }

    // ── Авто-предложения: точная оплата → оплаты одного дня → оплаты всего окна. ──
    const suggestedMovementIds = new Set<string>();
    type Suggestion = {
      movements: ReturnType<typeof serializeMovement>[];
      amount: string;
      /** Расхождение до 1 ₽ (округления) для неточного предложения, иначе null. */
      mismatchAmount?: string;
      reason: 'exact' | 'day' | 'window';
    };
    const suggestionsByEntry = new Map<string, Suggestion>();
    const serializedCache = new Map<string, ReturnType<typeof serializeMovement>>();

    const serializeState = (state: MovementState) => {
      let serialized = serializedCache.get(state.row.id);
      if (!serialized) {
        serialized = serializeMovement(state.row, state.linkedAmount);
        serializedCache.set(state.row.id, serialized);
      }
      return serialized;
    };

    const withDates = (state: MovementState) => ({
      state,
      date: isoDate(state.row.paymentDate),
    });

    for (const entry of bankEntries) {
      const entryType = entry.entryType;
      const covered = entry.bankReconciliationLinks.reduce(
        (acc, l) => acc + l.amount.toNumber(),
        0,
      );
      const remaining =
        toNumber(entry.amount) + toNumber(entry.fee) + toNumber(entry.refund) - covered;
      if (remaining <= 0.005) continue;

      const entryDate = isoDate(entry.entryDate);
      const windowFrom = addDays(entryDate, -lagDays);
      const candidates = [...movementStates.values()]
        .map(withDates)
        .filter(
          ({ state }) =>
            state.remainder > 0.005 && state.row.paymentForm in PAYMENT_FORM_TO_ENTRY_TYPE,
        )
        .filter(({ state }) => PAYMENT_FORM_TO_ENTRY_TYPE[state.row.paymentForm] === entryType)
        .filter(({ date }) => date >= windowFrom && date <= entryDate)
        .filter(({ state }) => !suggestedMovementIds.has(state.row.id))
        .sort((a, b) =>
          a.date === b.date ? b.state.remainder - a.state.remainder : a.date < b.date ? -1 : 1,
        );

      if (candidates.length === 0) continue;

      // 1) Одно зачисление ↔ одна оплата той же суммой (самый частый случай).
      const exact = candidates.find(({ state }) => Math.abs(state.remainder - remaining) <= 0.005);
      if (exact) {
        suggestedMovementIds.add(exact.state.row.id);
        suggestionsByEntry.set(entry.id, {
          movements: [serializeState(exact.state)],
          amount: remaining.toFixed(2),
          reason: 'exact',
        });
        continue;
      }

      // 2) Групповое зачисление: все оплаты одного дня тем же способом (терминал/QR).
      const byDay = new Map<string, typeof candidates>();
      for (const candidate of candidates) {
        const list = byDay.get(candidate.date) ?? [];
        list.push(candidate);
        byDay.set(candidate.date, list);
      }
      for (const [, dayList] of [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))) {
        const daySum = dayList.reduce((acc, { state }) => acc + state.remainder, 0);
        if (Math.abs(daySum - remaining) <= 0.005) {
          for (const { state } of dayList) suggestedMovementIds.add(state.row.id);
          suggestionsByEntry.set(entry.id, {
            movements: dayList.map(({ state }) => serializeState(state)),
            amount: remaining.toFixed(2),
            reason: 'day',
          });
          break;
        }
      }
      if (suggestionsByEntry.has(entry.id)) continue;

      // 3) Все оплаты окна в сумме дают зачисление (накопилось за несколько дней).
      const windowSum = candidates.reduce((acc, { state }) => acc + state.remainder, 0);
      if (Math.abs(windowSum - remaining) <= 0.005) {
        for (const { state } of candidates) suggestedMovementIds.add(state.row.id);
        suggestionsByEntry.set(entry.id, {
          movements: candidates.map(({ state }) => serializeState(state)),
          amount: remaining.toFixed(2),
          reason: 'window',
        });
        continue;
      }

      // 4) Одна оплата с расхождением менее 1 ₽ (округления стоимостей):
      // точного совпадения нет, но разница копеечная — предлагаем сопоставить
      // с пометкой; при фиксации связь урежется до зачисления с note.
      const nearMiss = candidates.find(({ state }) => Math.abs(state.remainder - remaining) < 1);
      if (nearMiss) {
        const diff = nearMiss.state.remainder - remaining;
        suggestedMovementIds.add(nearMiss.state.row.id);
        suggestionsByEntry.set(entry.id, {
          movements: [serializeState(nearMiss.state)],
          amount: remaining.toFixed(2),
          mismatchAmount: diff.toFixed(2),
          reason: 'exact',
        });
      }
    }

    // ── Ответ: банк-записи с покрытием и предложениями. ──
    const entries = bankEntries.map((entry) => {
      const covered = entry.bankReconciliationLinks.reduce(
        (acc, l) => acc + l.amount.toNumber(),
        0,
      );
      const mismatchAmount = entry.bankReconciliationLinks.reduce(
        (acc, l) => acc + (l.mismatchAmount?.toNumber() ?? 0),
        0,
      );
      const total = toNumber(entry.amount) + toNumber(entry.fee) + toNumber(entry.refund);
      const remaining = Math.max(0, total - covered);
      const suggestion = suggestionsByEntry.get(entry.id);
      return {
        id: entry.id,
        entryDate: isoDate(entry.entryDate),
        bank: entry.bank,
        entryType: entry.entryType,
        amount: entry.amount.toString(),
        fee: entry.fee.toString(),
        refund: entry.refund.toString(),
        total: total.toFixed(2),
        counterparty: entry.counterparty,
        notes: entry.notes,
        links: entry.bankReconciliationLinks
          .slice()
          .sort(
            (a, b) => a.moneyMovement.paymentDate.getTime() - b.moneyMovement.paymentDate.getTime(),
          )
          .map((link) => ({
            id: link.id,
            amount: link.amount.toString(),
            /** Пояснение, почему зафиксирована урезанная сумма (расхождение). */
            note: link.note ?? null,
            createdAt: link.createdAt.toISOString(),
            moneyMovement: serializeState(
              movementStates.get(link.moneyMovementId) ?? {
                row: link.moneyMovement,
                linkedAmount: 0,
                remainder: link.moneyMovement.amount.toNumber(),
              },
            ),
          })),
        coveredAmount: covered.toFixed(2),
        /** Суммарное расхождение связей (округления) — показывается у «Сверено». */
        mismatchAmount: mismatchAmount.toFixed(2),
        remainingAmount: remaining.toFixed(2),
        suggestion: suggestion ?? null,
        status: remaining <= 0.005 ? 'covered' : covered > 0.005 ? 'partial' : 'unmatched',
      };
    });

    // ── Оплаты ДП за период без поступления. ──
    const unmatchedPayments = [...movementStates.values()]
      .map(withDates)
      .filter(({ date }) => date >= dateFrom && date <= dateTo)
      .filter(({ state }) => state.remainder > 0.005)
      .filter(({ state }) => !suggestedMovementIds.has(state.row.id))
      .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
      .map(({ state, date }) => ({
        ...serializeState(state),
        /** Лаг ещё не истёк: поступление может прийти после конца периода. */
        inTransit: addDays(date, lagDays) > dateTo,
      }));

    // ── Итоги. ──
    const periodStates = [...movementStates.values()].filter((state) => {
      const date = isoDate(state.row.paymentDate);
      return date >= dateFrom && date <= dateTo;
    });
    const dpSum = periodStates.reduce((acc, s) => acc + s.row.amount.toNumber(), 0);
    const matchedDpSum = periodStates.reduce(
      (acc, s) => acc + Math.min(s.linkedAmount, s.row.amount.toNumber()),
      0,
    );
    const suggestedSum = [...suggestionsByEntry.values()].reduce(
      (acc, s) => acc + Number(s.amount),
      0,
    );
    const inTransitSum = unmatchedPayments
      .filter((p) => p.inTransit)
      .reduce((acc, p) => acc + Number(p.remainder), 0);
    const unmatchedDpSum =
      unmatchedPayments.reduce((acc, p) => acc + Number(p.remainder), 0) - inTransitSum;

    const bankSum = entries.reduce((acc, e) => acc + Number(e.total), 0);
    const coveredSum = entries.reduce((acc, e) => acc + Number(e.coveredAmount), 0);
    const remainingBankSum = entries.reduce((acc, e) => acc + Number(e.remainingAmount), 0);

    return {
      dateFrom,
      dateTo,
      lagDays,
      entries,
      unmatchedPayments,
      totals: {
        entriesCount: entries.length,
        paymentsCount: periodStates.length,
        bankSum: bankSum.toFixed(2),
        coveredSum: coveredSum.toFixed(2),
        remainingBankSum: remainingBankSum.toFixed(2),
        dpSum: dpSum.toFixed(2),
        matchedDpSum: matchedDpSum.toFixed(2),
        suggestedSum: suggestedSum.toFixed(2),
        unmatchedDpSum: Math.max(0, unmatchedDpSum).toFixed(2),
        inTransitSum: inTransitSum.toFixed(2),
      },
    };
  }

  /**
   * Зафиксировать связи: суммы перестают участвовать в дальнейших сверках.
   * amount по умолчанию — максимум доступного (остаток оплаты и остаток зачисления);
   * явным значением фиксируют частичное покрытие (клиент платил частями).
   */
  async createLinks(
    dto: { bankEntryId: string; items: { moneyMovementId: string; amount?: number }[] },
    createdById?: string,
  ) {
    const entry = await this.prisma.bankEntry.findUnique({
      where: { id: dto.bankEntryId },
      include: { bankReconciliationLinks: true },
    });
    if (!entry) throw new NotFoundException('Поступление банка не найдено');

    const entryTotal = toNumber(entry.amount) + toNumber(entry.fee) + toNumber(entry.refund);
    const alreadyCovered = entry.bankReconciliationLinks.reduce(
      (acc, l) => acc + l.amount.toNumber(),
      0,
    );
    let entryRemaining = entryTotal - alreadyCovered;
    if (entryRemaining <= 0.005) {
      throw new BadRequestException('Поступление уже полностью сверено');
    }

    const movementIds = dto.items.map((item) => item.moneyMovementId);
    const movements = await this.prisma.moneyMovement.findMany({
      where: { id: { in: movementIds }, deletedAt: null },
      include: { bankReconciliationLinks: true },
    });
    const movementById = new Map(movements.map((m) => [m.id, m]));

    const prepared: {
      moneyMovementId: string;
      amount: number;
      mismatchAmount: number | null;
      note: string | null;
    }[] = [];
    for (const item of dto.items) {
      const movement = movementById.get(item.moneyMovementId);
      if (!movement) throw new NotFoundException(`Оплата ДП не найдена (${item.moneyMovementId})`);
      const expectedType = PAYMENT_FORM_TO_ENTRY_TYPE[movement.paymentForm];
      if (expectedType !== entry.entryType) {
        throw new BadRequestException(
          `Способ оплаты ДП (${movement.paymentForm}) не соответствует зачислению (${entry.entryType})`,
        );
      }
      const movementAmount = movement.amount.toNumber();
      const linked = movement.bankReconciliationLinks.reduce(
        (acc, l) => acc + l.amount.toNumber(),
        0,
      );
      const movementRemaining = movementAmount - linked;
      if (movementRemaining <= 0.005) {
        throw new BadRequestException('Оплата уже полностью сверена');
      }
      // Расхождение сумм (например, из-за округления стоимостей) не блокирует
      // сверку: связь фиксируется на доступный остаток, а разница — в note.
      const requested = item.amount ?? movementRemaining;
      const amount = Math.round(Math.min(requested, movementRemaining, entryRemaining) * 100) / 100;
      if (amount <= 0) throw new BadRequestException('Сумма связи должна быть положительной');
      const mismatch = requested - amount;
      const mismatchAmount = mismatch > 0.005 ? Math.round(mismatch * 100) / 100 : null;
      const note =
        mismatchAmount != null
          ? `Расхождение сумм: к сопоставлению заявлено ${requested.toFixed(2)} ₽, зафиксировано ${amount.toFixed(2)} ₽ (разница ${mismatchAmount.toFixed(2)} ₽)`
          : null;
      prepared.push({ moneyMovementId: movement.id, amount, mismatchAmount, note });
      entryRemaining = Math.round((entryRemaining - amount) * 100) / 100;
    }

    for (const item of prepared) {
      await this.prisma.bankReconciliationLink.upsert({
        where: {
          bankEntryId_moneyMovementId: {
            bankEntryId: entry.id,
            moneyMovementId: item.moneyMovementId,
          },
        },
        update: { amount: item.amount, note: item.note, mismatchAmount: item.mismatchAmount },
        create: {
          bankEntryId: entry.id,
          moneyMovementId: item.moneyMovementId,
          amount: item.amount,
          note: item.note,
          mismatchAmount: item.mismatchAmount,
          createdById: createdById ?? null,
        },
      });
    }

    return {
      bankEntryId: entry.id,
      created: prepared.length,
      warnings: prepared.filter((p) => p.note).map((p) => p.note),
    };
  }

  /** Снять фиксацию (только супер-админ): суммы вернутся в будущие сверки. */
  async removeLink(linkId: string) {
    const link = await this.prisma.bankReconciliationLink.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Связь сверки не найдена');
    await this.prisma.bankReconciliationLink.delete({ where: { id: linkId } });
    return { deleted: true };
  }

  /** Снять всю фиксацию с поступления (только супер-админ). */
  async removeAllLinks(bankEntryId: string) {
    const entry = await this.prisma.bankEntry.findUnique({
      where: { id: bankEntryId },
      include: { bankReconciliationLinks: true },
    });
    if (!entry) throw new NotFoundException('Поступление банка не найдено');
    const result = await this.prisma.bankReconciliationLink.deleteMany({
      where: { bankEntryId },
    });
    return { deleted: result.count };
  }

  /** История зафиксированных связей за период (кто, когда и что сверил). */
  async listLinks(params: { dateFrom?: string; dateTo?: string; limit?: number }) {
    const where: Prisma.BankReconciliationLinkWhereInput = {};
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) where.createdAt.lte = new Date(`${params.dateTo}T23:59:59.999Z`);
    }
    const links = await this.prisma.bankReconciliationLink.findMany({
      where,
      include: {
        bankEntry: true,
        moneyMovement: { include: MOVEMENT_INCLUDE },
        createdBy: { select: MANAGER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(params.limit ?? 100, 200),
    });
    return {
      items: links.map((link) => ({
        id: link.id,
        amount: link.amount.toString(),
        note: link.note ?? null,
        createdAt: link.createdAt.toISOString(),
        createdBy: movementName(link.createdBy),
        bankEntry: {
          id: link.bankEntry.id,
          entryDate: isoDate(link.bankEntry.entryDate),
          bank: link.bankEntry.bank,
          entryType: link.bankEntry.entryType,
        },
        moneyMovement: serializeMovement(link.moneyMovement, link.moneyMovement.amount.toNumber()),
      })),
    };
  }
}
