import type { Prisma } from '@prisma/client';
import { round2, toDateIso, toNum } from '../salary.constants';

/** Связи договора з/п, нужные для построения строк расчёта. */
export const CONTRACT_CALC_INCLUDE = {
  office: { select: { id: true, name: true } },
  category: true,
  manager: { select: { id: true, firstName: true, lastName: true } },
  surveyor: { select: { id: true, firstName: true, lastName: true } },
  extraBills: { orderBy: { date: 'asc' as const } },
} as const;

export type SalaryCalcContract = Prisma.SalaryContractGetPayload<{
  include: typeof CONTRACT_CALC_INCLUDE;
}>;

type SalaryRole = 'MANAGER' | 'SURVEYOR' | 'LEAD_SPECIALIST' | 'BRIGADIER';

/**
 * Строки расчёта по договорам периода: выбор ставки по приоритету
 * «переопределение договора → правило офиса → правило всех офисов → направление»,
 * доли при заключении/закрытии с учётом сдвига на минимальную предоплату,
 * доп. соглашения периода и производные фонды (замерщик, ВС, бригадир).
 */
export function buildSalaryCalcRows(input: {
  contracts: SalaryCalcContract[];
  /** Правила ставок: «categoryId|officeId|*|role» → %. */
  rulesByKey: Map<string, number>;
  from: Date;
  to: Date;
  /** Даты набора минимальной предоплаты по пакетам (для авто-договоров). */
  prepaidByPackage: Map<string, Date | null>;
  /** Оплачено деньгами по пакетам (для авто-договоров). */
  paidByPackage: Map<string, number>;
}) {
  const { contracts, rulesByKey, prepaidByPackage, paidByPackage } = input;
  const from = input.from.getTime();
  const to = input.to.getTime();
  const inPeriod = (d: Date | null | undefined) => !!d && d.getTime() >= from && d.getTime() <= to;

  return contracts.map((contract) => {
    const category = contract.category;
    const resolvePercent = (
      role: SalaryRole,
      override: Prisma.Decimal | null,
      categoryDefault: Prisma.Decimal,
    ): number => {
      if (override !== null && override !== undefined) return toNum(override);
      const byOffice = rulesByKey.get(`${category.id}|${contract.officeId}|${role}`);
      if (byOffice !== undefined) return byOffice;
      const common = rulesByKey.get(`${category.id}|*|${role}`);
      if (common !== undefined) return common;
      return toNum(categoryDefault);
    };

    const managerPercent = resolvePercent(
      'MANAGER',
      contract.managerPercentOverride,
      category.managerPercent,
    );
    const surveyorPercent = resolvePercent(
      'SURVEYOR',
      contract.surveyorPercentOverride,
      category.surveyorPercent,
    );
    const vsPercent = resolvePercent(
      'LEAD_SPECIALIST',
      contract.vsPercentOverride,
      category.vsPercent,
    );
    const brigadierPercent = resolvePercent(
      'BRIGADIER',
      contract.brigadierPercentOverride,
      category.brigadierPercent,
    );

    const splitSign = toNum(category.splitSign);
    const splitClose = toNum(category.splitClose);
    const base = toNum(contract.baseAmount);

    // Минимальная предоплата: пока она не внесена, з/п по договору не считается
    // никому («бронь» без старта исполнения). После внесения доля «при заключении»
    // приходится на месяц даты набора предоплаты (а не дату подписания).
    const minPrepaidPercent = toNum(category.minPrepaidPercent);
    const prepaidReachedAt = contract.sourcePackageId
      ? (prepaidByPackage.get(contract.sourcePackageId) ?? null)
      : contract.prepaidReachedAt;
    const requiresPrepaid = minPrepaidPercent > 0;
    const prepaidOk = !requiresPrepaid || prepaidReachedAt !== null;
    const signDate =
      requiresPrepaid && prepaidReachedAt
        ? laterOf(contract.signedAt, prepaidReachedAt)
        : contract.signedAt;

    const signedIn = prepaidOk && inPeriod(signDate);
    const closedIn = prepaidOk && inPeriod(contract.closedAt);

    const signPart = signedIn ? base * (managerPercent / 100) * splitSign : 0;
    const closePart = closedIn ? base * (managerPercent / 100) * splitClose : 0;
    const extraBillsInPeriod = prepaidOk ? contract.extraBills.filter((b) => inPeriod(b.date)) : [];
    const extraBase = extraBillsInPeriod.reduce((sum, b) => sum + toNum(b.amount), 0);
    const extraPart = extraBase * (managerPercent / 100);

    const managerAmount = round2(signPart + closePart + extraPart);

    const managerName =
      contract.managerName ||
      [contract.manager?.lastName, contract.manager?.firstName].filter(Boolean).join(' ').trim() ||
      null;
    const surveyorName =
      contract.surveyorName ||
      [contract.surveyor?.lastName, contract.surveyor?.firstName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      null;

    // Замерщик/ВС/бригадир — пропорционально ставке менеджера (как в таблице: зп × %свой / %мен).
    const scale = managerPercent > 0 ? 1 / (managerPercent / 100) : 0;
    // Нет замерщика (замера не было или он не указан) — з/п за замер не считается
    // и никому не переходит.
    const surveyorAmount =
      contract.surveyorHandled && surveyorName != null
        ? round2(managerAmount * scale * (surveyorPercent / 100))
        : 0;
    const vsAmount = round2(managerAmount * scale * (vsPercent / 100));
    const brigadierAmount = round2(managerAmount * scale * (brigadierPercent / 100));

    return {
      id: contract.id,
      officeId: contract.officeId,
      officeName: contract.office.name,
      categoryId: category.id,
      categoryCode: category.code,
      categoryName: category.name,
      number: contract.number,
      signedAt: toDateIso(contract.signedAt),
      closedAt: toDateIso(contract.closedAt),
      /** Дата внесения минимальной предоплаты (старт расчёта з/п); null — не требуется/не внесена. */
      prepaidReachedAt: toDateIso(prepaidReachedAt),
      /** Минимальная предоплата направления, % (0 — не требуется). */
      minPrepaidPercent,
      /** Минимальная предоплата требуется, но ещё не внесена — з/п не считается. */
      awaitingPrepaid: requiresPrepaid && !prepaidOk,
      /** Дата, к которой отнесена доля «при заключении» (с учётом сдвига на предоплату). */
      signDate: toDateIso(signDate),
      customerName: contract.customerName,
      managerId: contract.managerId,
      managerName,
      surveyorId: contract.surveyorId,
      surveyorName,
      managerHandled: contract.managerHandled,
      surveyorHandled: contract.surveyorHandled,
      baseAmount: base,
      /** Оплачено деньгами по договору (null — ручная запись без пакета). */
      paidAmount: contract.sourcePackageId
        ? (paidByPackage.get(contract.sourcePackageId) ?? 0)
        : null,
      /** Оплачено, % от стоимости договора (null — нет данных/нулевая стоимость). */
      paidPercent:
        contract.sourcePackageId && base > 0
          ? round2(((paidByPackage.get(contract.sourcePackageId) ?? 0) / base) * 100)
          : null,
      extraBillsAmount: round2(extraBase),
      extraBills: extraBillsInPeriod.map((b) => ({
        date: toDateIso(b.date),
        amount: round2(toNum(b.amount)),
      })),
      percents: {
        manager: managerPercent,
        surveyor: surveyorPercent,
        vs: vsPercent,
        brigadier: brigadierPercent,
      },
      split: { sign: splitSign, close: splitClose },
      parts: { sign: round2(signPart), close: round2(closePart), extra: round2(extraPart) },
      managerAmount,
      surveyorAmount,
      vsAmount,
      brigadierAmount,
      signedInPeriod: signedIn,
      closedInPeriod: closedIn,
      totalAmount: round2(base + toNum(contractSum(contract))),
    };
  });
}

/** Полная стоимость договора с учётом всех доп. соглашений (для справки). */
function contractSum(contract: { extraBills: Array<{ amount: Prisma.Decimal }> }): number {
  return contract.extraBills.reduce((s, b) => s + toNum(b.amount), 0);
}

/** Поздняя из двух дат (null-компоненты игнорируются). */
function laterOf(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}
