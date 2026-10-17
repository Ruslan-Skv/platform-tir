import type { Prisma, PrismaClient } from '@prisma/client';
import { round2, toNum } from '../salary.constants';

/** Оплата договора, участвующая в подсчёте накопленной предоплаты. */
export type PrepaidMovement = {
  paymentDate: Date;
  amount: Prisma.Decimal;
  paymentType: string;
};

/**
 * Дата внесения минимальной предоплаты по договору: первый день, когда сумма
 * оплат (возвраты вычитаются) достигла minPrepaidPercent % от стоимости
 * договора. null — порог не задан (0%) или ещё не набран.
 * Чистая функция: и синхронизация, и расчёт з/п считают её одинаково.
 */
export function computePrepaidReachedAt(
  baseAmount: number,
  minPrepaidPercent: number,
  movements: PrepaidMovement[],
): Date | null {
  if (minPrepaidPercent <= 0) return null;
  const required = round2((baseAmount * minPrepaidPercent) / 100);
  if (required <= 0) return null;
  const sorted = movements
    .slice()
    .sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
  let cumulative = 0;
  for (const m of sorted) {
    cumulative += m.paymentType === 'REFUND' ? -toNum(m.amount) : toNum(m.amount);
    if (cumulative >= required) return m.paymentDate;
  }
  return null;
}

/**
 * Сумма оплат по пакетам договоров (возвраты вычитаются) одним запросом.
 * map: id пакета → оплачено деньгами.
 */
export async function loadPaidAmounts(
  prisma: PrismaClient | Prisma.TransactionClient,
  packageIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (packageIds.length === 0) return result;
  const payments = await prisma.contractDocumentPackagePayment.findMany({
    where: { packageId: { in: packageIds } },
    select: { packageId: true, amount: true, paymentType: true },
  });
  for (const p of payments) {
    const delta = p.paymentType === 'REFUND' ? -toNum(p.amount) : toNum(p.amount);
    result.set(p.packageId, round2((result.get(p.packageId) ?? 0) + delta));
  }
  return result;
}

/**
 * Даты набора минимальной предоплаты для наборов пакетов договоров одним
 * запросом к оплатам «Оплаты и Управление договором» (первичный источник;
 * журнал ДП — зеркало и может отставать). map: id пакета → дата (null — не набрана).
 */
export async function loadPrepaidReachedDates(
  prisma: PrismaClient | Prisma.TransactionClient,
  entries: Array<{ packageId: string; baseAmount: number; minPrepaidPercent: number }>,
): Promise<Map<string, Date | null>> {
  const result = new Map<string, Date | null>();
  if (entries.length === 0) return result;
  const payments = await prisma.contractDocumentPackagePayment.findMany({
    where: { packageId: { in: entries.map((e) => e.packageId) } },
    select: { packageId: true, paymentDate: true, amount: true, paymentType: true },
  });
  const byPackage = new Map<string, PrepaidMovement[]>();
  for (const p of payments) {
    const list = byPackage.get(p.packageId) ?? [];
    list.push(p);
    byPackage.set(p.packageId, list);
  }
  for (const e of entries) {
    result.set(
      e.packageId,
      computePrepaidReachedAt(e.baseAmount, e.minPrepaidPercent, byPackage.get(e.packageId) ?? []),
    );
  }
  return result;
}
