import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { fromDateIso, round2 } from './salary.constants';

/**
 * Синхронизация договоров расчёта з/п из раздела «Договоры» (contract-document-packages).
 *
 * Два режима:
 *  - sync() — полная синхронизация всех подписанных пакетов (кнопка/автозапуск при
 *    открытии раздела; в проде — первоначальное наполнение);
 *  - syncPackageSafe(id) — событийный режим: после каждого изменения пакета
 *    (CrudService.update / restoreFromTrash) обновляется запись з/п только этого пакета.
 *    Ошибки логируются и не ломают сохранение самого договора.
 *
 * Переносится: №, офис, направление (kind → код направления з/п), дата подписания
 * (contractConcludedAt), дата закрытия (акт сдачи-приёмки), заказчик, менеджер
 * (карточка менеджера → ответственный → создавший), замерщик, стоимость договора
 * (contract.totalAmount, иначе смета со скидкой), подписанные Д/с (сумма со скидкой
 * и дата подписания).
 *
 * Не перезаписываются (остаются ручными настройками расчёта): переопределения
 * процентов, note и т.п. Ручные записи не трогаются, кроме совпадения по
 * «офис + №» — такая запись «усыновляется» (это тот же договор, пришедший из
 * Google-таблицы до появления синхронизации).
 */
@Injectable()
export class SalaryContractsSyncService {
  private readonly logger = new Logger(SalaryContractsSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sync(): Promise<{
    created: number;
    updated: number;
    adopted: number;
    skipped: Array<{ number: string; reason: string }>;
  }> {
    const [packages, ctx] = await Promise.all([
      this.prisma.contractDocumentPackage.findMany({
        where: { deletedAt: null, status: 'CONTRACT_CONCLUDED' },
        select: PACKAGE_SELECT,
        orderBy: { createdAt: 'asc' },
      }),
      this.buildContext(),
    ]);

    const report = {
      created: 0,
      updated: 0,
      adopted: 0,
      skipped: [] as Array<{ number: string; reason: string }>,
    };

    for (const pkg of packages) {
      const outcome = await this.upsertPackage(pkg, ctx);
      if (outcome.kind === 'skipped') report.skipped.push(outcome);
      else report[outcome.kind] += 1;
    }

    return report;
  }

  /** Событийная синхронизация одного пакета: ошибки логируются, не бросаются. */
  async syncPackageSafe(packageId: string): Promise<void> {
    try {
      await this.syncPackage(packageId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Событийная синхронизация з/п пакета ${packageId} не выполнена: ${message}`);
    }
  }

  private async syncPackage(packageId: string): Promise<void> {
    const [pkg, ctx] = await Promise.all([
      this.prisma.contractDocumentPackage.findFirst({
        where: { id: packageId, deletedAt: null, status: 'CONTRACT_CONCLUDED' },
        select: PACKAGE_SELECT,
      }),
      this.buildContext(),
    ]);
    if (!pkg) return; // не подписан / удалён — записи з/п не касается
    await this.upsertPackage(pkg, ctx);
  }

  // --- Внутреннее ---

  private async buildContext() {
    const [categories, offices, existing] = await Promise.all([
      this.prisma.salaryCategory.findMany({ select: { id: true, code: true } }),
      this.prisma.office.findMany({ select: { id: true } }),
      this.prisma.salaryContract.findMany({
        select: { id: true, officeId: true, number: true, sourcePackageId: true },
      }),
    ]);
    const byPackageId = new Map<string, (typeof existing)[number]>();
    const byOfficeNumber = new Map<string, (typeof existing)[number]>();
    for (const row of existing) {
      if (row.sourcePackageId) byPackageId.set(row.sourcePackageId, row);
      byOfficeNumber.set(`${row.officeId}|${row.number}`, row);
    }
    return {
      categoryByCode: new Map(categories.map((c) => [c.code, c])),
      officeIds: new Set(offices.map((o) => o.id)),
      byPackageId,
      byOfficeNumber,
    };
  }

  private async upsertPackage(
    pkg: PackageRow,
    ctx: Awaited<ReturnType<SalaryContractsSyncService['buildContext']>>,
  ): Promise<
    | { kind: 'created' | 'updated' | 'adopted' }
    | { kind: 'skipped'; number: string; reason: string }
  > {
    const fd = asRecord(pkg.formData);
    const contract = asRecord(fd?.contract);
    const number = nonEmptyString(contract?.number);
    const label = number ?? `пакет …${pkg.id.slice(-6)}`;
    if (!number) return { kind: 'skipped', number: label, reason: 'нет № договора' };
    const officeId = nonEmptyString(contract?.officeId);
    if (!officeId || !ctx.officeIds.has(officeId)) {
      return { kind: 'skipped', number: label, reason: 'не указан офис заключения' };
    }
    const category = ctx.categoryByCode.get(pkg.kind);
    if (!category) {
      return {
        kind: 'skipped',
        number: label,
        reason: `в настройках з/п нет направления с кодом «${pkg.kind}»`,
      };
    }

    const customer = asRecord(fd?.customer);
    const executor = asRecord(fd?.executor);
    const managerId =
      nonEmptyString(executor?.signatoryCrmUserId) ||
      pkg.responsibleManagerId ||
      pkg.createdById ||
      null;
    const surveyorId = nonEmptyString(contract?.surveyorUserId);

    const discountRaw = nonEmptyString(contract?.discountPercent);
    let baseAmount = parseFlexibleNumber(contract?.totalAmount);
    if (baseAmount === null) {
      baseAmount = snapshotTotalAfterDiscount(asRecord(fd?.estimate)?.snapshot, discountRaw);
    }
    baseAmount = baseAmount === null ? 0 : Math.max(round2(baseAmount), 0);

    const extraBills = collectSignedAddenda(fd, discountRaw);
    const signedDay = isoDayOrNull(fd?.contractConcludedAt);
    const closedDay = isoDayOrNull(fd?.repairContractCloseActSignedAt);

    const data = {
      officeId,
      categoryId: category.id,
      number,
      signedAt: signedDay ? fromDateIso(signedDay) : null,
      closedAt: closedDay ? fromDateIso(closedDay) : null,
      customerName:
        nonEmptyString(customer?.fullName) ?? nonEmptyString(customer?.organizationName),
      managerId,
      managerName: null,
      surveyorId: surveyorId ?? null,
      surveyorName: null,
      managerHandled: managerId !== null,
      surveyorHandled: surveyorId !== null || nonEmptyString(fd?.linkedMeasurementId) !== null,
      baseAmount,
    };

    const match = ctx.byPackageId.get(pkg.id) ?? ctx.byOfficeNumber.get(`${officeId}|${number}`);
    try {
      if (match) {
        const wasAuto = match.sourcePackageId !== null;
        await this.prisma.salaryContract.update({
          where: { id: match.id },
          data: {
            ...data,
            sourcePackageId: pkg.id,
            extraBills: { deleteMany: {}, create: extraBills },
          },
        });
        return { kind: wasAuto ? 'updated' : 'adopted' };
      }
      const created = await this.prisma.salaryContract.create({
        data: {
          ...data,
          sourcePackageId: pkg.id,
          extraBills: { create: extraBills },
        },
        select: { id: true },
      });
      ctx.byPackageId.set(pkg.id, {
        id: created.id,
        officeId,
        number,
        sourcePackageId: pkg.id,
      });
      return { kind: 'created' };
    } catch (err) {
      this.logger.warn(`Синхронизация: договор №${label} пропущен (${String(err)})`);
      return { kind: 'skipped', number: label, reason: 'не удалось сохранить (конфликт номера?)' };
    }
  }
}

const PACKAGE_SELECT = {
  id: true,
  kind: true,
  formData: true,
  responsibleManagerId: true,
  createdById: true,
} as const;

type PackageRow = {
  id: string;
  kind: string;
  formData: unknown;
  responsibleManagerId: string | null;
  createdById: string | null;
};

// ===== Разбор formData (JSON пакета) — защитно, как в money-movements =====

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Число из полей формы: «12 345,50», 12345.5, '8%' → number. */
function parseFlexibleNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** ISO-дата/дата-время или 'YYYY-MM-DD' → 'YYYY-MM-DD'; иначе null. */
function isoDayOrNull(value: unknown): string | null {
  const raw = nonEmptyString(value);
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/** 'дд.мм.гггг' → 'YYYY-MM-DD'; иначе null. */
function ruDayOrNull(value: unknown): string | null {
  const raw = nonEmptyString(value);
  if (!raw) return null;
  const match = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

/** Снимок сметы (total или сумма строк) со скидкой договора — как «СД» в списке договоров. */
function snapshotTotalAfterDiscount(
  snapshotRaw: unknown,
  discountPercentRaw: string | null,
): number | null {
  const snap = asRecord(snapshotRaw);
  if (!snap) return null;
  let base: number | null = null;
  if (typeof snap.total === 'number' && Number.isFinite(snap.total)) {
    base = snap.total;
  } else if (Array.isArray(snap.rooms)) {
    let sum = 0;
    for (const roomRaw of snap.rooms) {
      const room = asRecord(roomRaw);
      if (!Array.isArray(room?.lines)) continue;
      for (const lineRaw of room.lines) {
        const line = asRecord(lineRaw);
        if (!line) continue;
        const amount =
          typeof line.amount === 'number' ? line.amount : parseFlexibleNumber(line.amount);
        if (amount !== null) sum += amount;
      }
    }
    base = sum;
  }
  if (base === null) return null;
  const discount = discountPercentRaw === null ? 0 : (parseFlexibleNumber(discountPercentRaw) ?? 0);
  return round2(base * (1 - Math.min(Math.max(discount, 0), 100) / 100));
}

/** Подписанные Д/с пакета → доп. соглашения з/п (сумма со скидкой, дата подписания). */
function collectSignedAddenda(
  fd: Record<string, unknown> | null,
  discountRaw: string | null,
): Array<{ amount: number; date: Date; note: string | null }> {
  const bills: Array<{ amount: number; date: Date; note: string | null }> = [];
  if (!fd || !Array.isArray(fd.addendumSlots)) return bills;
  fd.addendumSlots.forEach((slotRaw, index) => {
    const slot = asRecord(slotRaw);
    if (!slot || (slot.status !== 'SIGNED' && slot.status !== 'PAID')) return;
    const amount = snapshotTotalAfterDiscount(slot.snapshot, discountRaw);
    if (amount === null) return;
    const docDates = Array.isArray(fd.addendumDocumentDates) ? fd.addendumDocumentDates : [];
    const day =
      isoDayOrNull(slot.signedAt) ??
      isoDayOrNull(slot.paidAt) ??
      ruDayOrNull(docDates[index]) ??
      null;
    if (!day) return; // без даты Д/с не попадает в расчёт з/п
    bills.push({ amount, date: fromDateIso(day), note: `Д/с №${index + 1}` });
  });
  return bills;
}
