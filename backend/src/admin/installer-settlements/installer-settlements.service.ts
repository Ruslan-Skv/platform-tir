import { Injectable } from '@nestjs/common';
import { ContractDocumentPackageKind, Prisma } from '@prisma/client';

import { PACKAGE_DIRECTION_REGISTRY } from '../../common/config/package-direction-registry.config';
import { PrismaService } from '../../database/prisma.service';
import {
  type AccruedInstallerTotal,
  computeInstallerAccrual,
  isProductLikeKind,
  normalizeProductMarkupPercent,
} from './installer-accrual';

const KIND_TO_DIRECTION_NAME = Object.fromEntries(
  PACKAGE_DIRECTION_REGISTRY.map((d) => [d.kind, d.name]),
) as Record<ContractDocumentPackageKind, string>;

const DIRECTION_NAME_TO_KIND = Object.fromEntries(
  PACKAGE_DIRECTION_REGISTRY.map((d) => [d.name, d.kind]),
) as Record<string, ContractDocumentPackageKind>;

const PRODUCT_KINDS: ContractDocumentPackageKind[] = [
  ContractDocumentPackageKind.WINDOWS,
  ContractDocumentPackageKind.DOORS,
  ContractDocumentPackageKind.BLINDS,
  ContractDocumentPackageKind.CEILINGS,
];

/** Экранирование спецсимволов ILIKE (% _ \) в поисковом запросе. */
function escapeLike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Мастер, удалённый из справочника (авансы с installerId = null) — отдельная строка сводки. */
function masterKey(installerId: string | null, installerName: string | null): string {
  return installerId ?? `name:${installerName ?? '—'}`;
}

type JournalRawRow = {
  id: string;
  packageId: string;
  installerId: string | null;
  installerName: string | null;
  installerLiveName: string | null;
  installerGrade: string | null;
  paidAt: Date;
  amount: Prisma.Decimal | number;
  /** Способ оплаты: CASH — наличные, BANK — банк; null — не указан (старые записи). */
  paymentMethod: string | null;
  note: string | null;
  createdAt: Date;
  createdById: string | null;
  createdByFirstName: string | null;
  createdByLastName: string | null;
  createdByEmail: string | null;
  packageKind: ContractDocumentPackageKind;
  packageStatus: string;
  contractNumber: string | null;
  customerName: string | null;
  objectAddress: string | null;
};

type CandidateRawRow = {
  id: string;
  kind: ContractDocumentPackageKind;
  contractNumber: string | null;
  customerName: string | null;
  discountPercent: string | null;
  discountType: string | null;
  discountAmount: string | null;
  taxPercent: string | null;
  markupPercent: string | null;
  gradeIncreasePercent: string | null;
  addendumSlotCountText: string | null;
  assignments: unknown;
  estimateSnapshot: unknown;
  addendumSnapshots: unknown[];
  addendumExcludedSnapshots: unknown[];
  addendumSlotDiscountTypes: unknown[];
  addendumSlotDiscountPercents: unknown[];
  addendumSlotDiscountAmounts: unknown[];
};

type MasterAgg = {
  key: string;
  installerId: string | null;
  snapshotName: string | null;
  accrued: number;
  lineCount: number;
  hasAccruals: boolean;
  paidTotal: number;
  paidInPeriod: number;
  advancesCount: number;
  advancesInPeriodCount: number;
  packageIds: Set<string>;
};

@Injectable()
export class InstallerSettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Журнал выплат (авансов) мастерам со сводкой «начислено / выплачено / остаток»
   * по каждому мастеру. Проводки попадают сюда автоматически из модалки
   * «Заказ-наряды» договоров (ContractDocumentPackageInstallerAdvance).
   *
   * Период и поиск фильтруют журнал выплат; сводка мастеров считается по всем
   * договорам выбранных направлений (остаток к выплате не зависит от периода —
   * в колонке «за период» отдельно видно, сколько выдано в выбранные даты).
   */
  async findAll(params?: {
    installerId?: string;
    direction?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { installerId, direction, dateFrom, dateTo, search, page = 1, limit = 50 } = params || {};
    const kind = direction ? DIRECTION_NAME_TO_KIND[direction] : undefined;
    const pattern = search?.trim() ? `%${escapeLike(search.trim())}%` : '';
    const take = Math.min(Math.max(limit, 1), 200);
    const skip = (page - 1) * take;

    const kindCondition = kind
      ? Prisma.sql` AND p."kind" = ${kind}::"ContractDocumentPackageKind"`
      : Prisma.empty;
    const installerCondition = installerId
      ? Prisma.sql` AND a."installerId" = ${installerId}`
      : Prisma.empty;

    const advanceDateConditions: Prisma.Sql[] = [];
    if (dateFrom) advanceDateConditions.push(Prisma.sql`a."paidAt" >= ${dateFrom}::date`);
    if (dateTo) advanceDateConditions.push(Prisma.sql`a."paidAt" <= ${dateTo}::date`);
    const advanceDateFilter = advanceDateConditions.length
      ? Prisma.sql` AND ${Prisma.join(advanceDateConditions, ' AND ')}`
      : Prisma.empty;

    // Поиск по журналу: мастер (снимок из журнала), комментарий, № договора, заказчик.
    const journalSearchFilter = pattern
      ? Prisma.sql` AND (
          COALESCE(a."installerName", '') ILIKE ${pattern}
          OR COALESCE(a."note", '') ILIKE ${pattern}
          OR COALESCE(p."formData"->'contract'->>'number', '') ILIKE ${pattern}
          OR COALESCE(p."formData"->'customer'->>'fullName', '') ILIKE ${pattern}
        )`
      : Prisma.empty;

    // Поиск для сводки: только реквизиты договора (у начислений нет текстовых полей).
    const packageSearchFilter = pattern
      ? Prisma.sql` AND (
          COALESCE(p."formData"->'contract'->>'number', '') ILIKE ${pattern}
          OR COALESCE(p."formData"->'customer'->>'fullName', '') ILIKE ${pattern}
        )`
      : Prisma.empty;

    const fromAdvances = (where: Prisma.Sql) => Prisma.sql`
      FROM contract_document_package_installer_advances a
      JOIN contract_document_packages p ON p."id" = a."packageId"
      LEFT JOIN installer_masters inst ON inst."id" = a."installerId"
      LEFT JOIN users u ON u."id" = a."createdById"
      WHERE p."deleted_at" IS NULL${kindCondition}${installerCondition}${advanceDateFilter}${where}`;

    const [
      rows,
      totalsRows,
      directionSumRows,
      candidates,
      installersRaw,
      installers,
      settingsRows,
    ] = await Promise.all([
      this.prisma.$queryRaw<JournalRawRow[]>(Prisma.sql`
          SELECT a."id", a."packageId", a."installerId", a."installerName", a."paidAt",
            a."amount", a."paymentMethod", a."note", a."createdAt", a."createdById",
            inst."fullName" AS "installerLiveName", inst."grade" AS "installerGrade",
            p."kind" AS "packageKind", p."status" AS "packageStatus",
            p."formData"->'contract'->>'number' AS "contractNumber",
            p."formData"->'customer'->>'fullName' AS "customerName",
            p."formData"->'object'->>'objectAddress' AS "objectAddress",
            u."firstName" AS "createdByFirstName", u."lastName" AS "createdByLastName",
            u."email" AS "createdByEmail"
          ${fromAdvances(journalSearchFilter)}
          ORDER BY a."paidAt" DESC, a."createdAt" DESC
          LIMIT ${take} OFFSET ${skip}`),
      this.prisma.$queryRaw<Array<{ total: number; totalPaid: Prisma.Decimal | number }>>(
        Prisma.sql`SELECT COUNT(*)::int AS "total", COALESCE(SUM(a."amount"), 0) AS "totalPaid"${fromAdvances(journalSearchFilter)}`,
      ),
      this.prisma.$queryRaw<
        Array<{ kind: ContractDocumentPackageKind; sum: Prisma.Decimal | number }>
      >(
        Prisma.sql`SELECT p."kind" AS "kind", COALESCE(SUM(a."amount"), 0) AS "sum"${fromAdvances(journalSearchFilter)} GROUP BY p."kind"`,
      ),
      // Договоры сводки: с авансами любого мастера или с назначенными мастерами
      // в итоговой смете (нужны и «недоплаты» по договорам без выплат).
      this.prisma.$queryRaw<CandidateRawRow[]>(Prisma.sql`
          SELECT p."id", p."kind",
            p."formData"->'contract'->>'number' AS "contractNumber",
            p."formData"->'customer'->>'fullName' AS "customerName",
            p."formData"->'contract'->>'discountPercent' AS "discountPercent",
            p."formData"->'contract'->>'discountType' AS "discountType",
            p."formData"->'contract'->>'discountAmount' AS "discountAmount",
            p."formData"->'workOrder'->>'taxPercent' AS "taxPercent",
            p."formData"->'workOrder'->>'markupPercent' AS "markupPercent",
            p."formData"->'workOrder'->>'gradeIncreasePercent' AS "gradeIncreasePercent",
            p."formData"->'addendumSlotCount' AS "addendumSlotCountText",
            p."formData"->'finalEstimateInstallerAssignments' AS "assignments",
            p."formData"->'estimate'->'snapshot' AS "estimateSnapshot",
            ARRAY[
              p."formData"->'addendumSlots'->0->'snapshot',
              p."formData"->'addendumSlots'->1->'snapshot',
              p."formData"->'addendumSlots'->2->'snapshot',
              p."formData"->'addendumSlots'->3->'snapshot',
              p."formData"->'addendumSlots'->4->'snapshot'
            ] AS "addendumSnapshots",
            ARRAY[
              p."formData"->'addendumSlots'->0->'excludedSnapshot',
              p."formData"->'addendumSlots'->1->'excludedSnapshot',
              p."formData"->'addendumSlots'->2->'excludedSnapshot',
              p."formData"->'addendumSlots'->3->'excludedSnapshot',
              p."formData"->'addendumSlots'->4->'excludedSnapshot'
            ] AS "addendumExcludedSnapshots",
            ARRAY[
              p."formData"->'addendumSlots'->0->>'discountType',
              p."formData"->'addendumSlots'->1->>'discountType',
              p."formData"->'addendumSlots'->2->>'discountType',
              p."formData"->'addendumSlots'->3->>'discountType',
              p."formData"->'addendumSlots'->4->>'discountType'
            ] AS "addendumSlotDiscountTypes",
            ARRAY[
              p."formData"->'addendumSlots'->0->>'discountPercent',
              p."formData"->'addendumSlots'->1->>'discountPercent',
              p."formData"->'addendumSlots'->2->>'discountPercent',
              p."formData"->'addendumSlots'->3->>'discountPercent',
              p."formData"->'addendumSlots'->4->>'discountPercent'
            ] AS "addendumSlotDiscountPercents",
            ARRAY[
              p."formData"->'addendumSlots'->0->>'discountAmount',
              p."formData"->'addendumSlots'->1->>'discountAmount',
              p."formData"->'addendumSlots'->2->>'discountAmount',
              p."formData"->'addendumSlots'->3->>'discountAmount',
              p."formData"->'addendumSlots'->4->>'discountAmount'
            ] AS "addendumSlotDiscountAmounts"
          FROM contract_document_packages p
          WHERE p."deleted_at" IS NULL${kindCondition}${packageSearchFilter}
            AND (
              EXISTS (
                SELECT 1 FROM contract_document_package_installer_advances adv
                WHERE adv."packageId" = p."id"
              )
              OR (
                jsonb_typeof(p."formData"->'finalEstimateInstallerAssignments') = 'object'
                AND p."formData"->'finalEstimateInstallerAssignments' <> '{}'::jsonb
              )
            )`),
      // Мастера для фильтра: все, у кого вообще есть выплаты по живым договорам.
      this.prisma.$queryRaw<
        Array<{ installerId: string | null; installerName: string | null }>
      >(Prisma.sql`
          SELECT DISTINCT a."installerId", a."installerName"
          FROM contract_document_package_installer_advances a
          JOIN contract_document_packages p ON p."id" = a."packageId"
          WHERE p."deleted_at" IS NULL`),
      this.prisma.installerMaster.findMany({
        select: { id: true, fullName: true, grade: true },
      }),
      this.prisma.contractDocumentRepairSettings.findMany({
        where: { kind: { in: PRODUCT_KINDS } },
        select: { kind: true, windowsWorkOrderMarkupPercent: true },
      }),
    ]);

    const installerById = new Map(installers.map((i) => [i.id, i]));
    const productMarkupByKind = new Map(
      settingsRows.map((row) => [
        row.kind as ContractDocumentPackageKind,
        normalizeProductMarkupPercent(row.windowsWorkOrderMarkupPercent ?? undefined),
      ]),
    );

    // «Начислено» по мастерам каждого договора-кандидата (порт расчёта заказ-наряда).
    const installerGradeById = new Map(
      [...installerById.entries()].map(([id, master]) => [id, master.grade]),
    );
    const accruedByPackage = new Map<string, Map<string, AccruedInstallerTotal>>();
    for (const pkg of candidates) {
      const gradeRaw = pkg.gradeIncreasePercent != null ? Number(pkg.gradeIncreasePercent) : NaN;
      accruedByPackage.set(
        pkg.id,
        computeInstallerAccrual({
          kind: pkg.kind,
          formData: {
            contract: {
              discountPercent: pkg.discountPercent,
              discountType: pkg.discountType,
              discountAmount: pkg.discountAmount,
            },
            workOrder: {
              taxPercent: pkg.taxPercent,
              markupPercent: pkg.markupPercent,
              gradeIncreasePercent: Number.isFinite(gradeRaw) ? gradeRaw : undefined,
            },
            estimate: { snapshot: (pkg.estimateSnapshot ?? null) as never },
            addendumSlotCount: Number(pkg.addendumSlotCountText ?? 0) || 0,
            addendumSlots: (pkg.addendumSnapshots ?? []).map((snapshot, index) => ({
              snapshot: (snapshot ?? null) as never,
              excludedSnapshot: ((pkg.addendumExcludedSnapshots ?? [])[index] ?? null) as never,
              discountType: (pkg.addendumSlotDiscountTypes ?? [])[index] ?? null,
              discountPercent: (pkg.addendumSlotDiscountPercents ?? [])[index] ?? null,
              discountAmount: (pkg.addendumSlotDiscountAmounts ?? [])[index] ?? null,
            })),
            finalEstimateInstallerAssignments: (pkg.assignments ?? null) as never,
          },
          ...(isProductLikeKind(pkg.kind)
            ? { productMarkupPercent: productMarkupByKind.get(pkg.kind) }
            : {}),
          installerGradeById,
        }),
      );
    }

    // Все выплаты по договорам-кандидатам (без периода — остаток актуальный на сейчас).
    const candidateIds = candidates.map((c) => c.id);
    const advances =
      candidateIds.length > 0
        ? await this.prisma.contractDocumentPackageInstallerAdvance.findMany({
            where: {
              packageId: { in: candidateIds },
              ...(installerId ? { installerId } : {}),
            },
            select: {
              packageId: true,
              installerId: true,
              installerName: true,
              amount: true,
              paidAt: true,
            },
          })
        : [];

    const masters = new Map<string, MasterAgg>();
    const ensureMaster = (id: string | null, snapshotName: string | null): MasterAgg => {
      const key = masterKey(id, snapshotName);
      let row = masters.get(key);
      if (!row) {
        row = {
          key,
          installerId: id,
          snapshotName,
          accrued: 0,
          lineCount: 0,
          hasAccruals: false,
          paidTotal: 0,
          paidInPeriod: 0,
          advancesCount: 0,
          advancesInPeriodCount: 0,
          packageIds: new Set<string>(),
        };
        masters.set(key, row);
      }
      if (!row.snapshotName && snapshotName) row.snapshotName = snapshotName;
      return row;
    };

    for (const [pkgId, byInstaller] of accruedByPackage.entries()) {
      for (const [id, totals] of byInstaller.entries()) {
        if (installerId && id !== installerId) continue;
        const row = ensureMaster(id, null);
        row.accrued += totals.total;
        row.lineCount += totals.lineCount;
        row.hasAccruals = true;
        row.packageIds.add(pkgId);
      }
    }

    const paidInPeriodByDate = (paidAt: Date): boolean => {
      const iso = isoDate(paidAt);
      return (!dateFrom || iso >= dateFrom) && (!dateTo || iso <= dateTo);
    };

    for (const adv of advances) {
      const row = ensureMaster(adv.installerId, adv.installerName);
      const amount = adv.amount.toNumber();
      row.paidTotal += amount;
      row.advancesCount += 1;
      row.packageIds.add(adv.packageId);
      if (paidInPeriodByDate(adv.paidAt)) {
        row.paidInPeriod += amount;
        row.advancesInPeriodCount += 1;
      }
    }

    const resolveMasterName = (row: MasterAgg): { name: string; grade: string | null } => {
      if (row.installerId) {
        const live = installerById.get(row.installerId);
        if (live) return { name: live.fullName, grade: live.grade };
      }
      return { name: row.snapshotName ?? 'Мастер удалён из справочника', grade: null };
    };

    const masterSummaries = [...masters.values()]
      .map((row) => {
        const { name, grade } = resolveMasterName(row);
        return {
          key: row.key,
          installerId: row.installerId,
          name,
          grade,
          /** Есть назначения мастера в заказ-нарядах; иначе остаток неизвестен. */
          hasAccruals: row.hasAccruals,
          accrued: round2(row.accrued),
          lineCount: row.lineCount,
          paidTotal: round2(row.paidTotal),
          paidInPeriod: round2(row.paidInPeriod),
          advancesCount: row.advancesCount,
          advancesInPeriodCount: row.advancesInPeriodCount,
          packagesCount: row.packageIds.size,
          /** Остаток к выплате; отрицательный — переплата; null — нет заказ-наряда. */
          balance: row.hasAccruals ? round2(row.accrued - row.paidTotal) : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    // Опции фильтра «Мастер»: живое имя из справочника приоритетнее снимка из журнала.
    const installerOptionsById = new Map<string, { id: string; name: string }>();
    for (const raw of installersRaw) {
      if (!raw.installerId) continue;
      const live = installerById.get(raw.installerId);
      const name = live?.fullName ?? raw.installerName ?? 'Мастер удалён из справочника';
      const prev = installerOptionsById.get(raw.installerId);
      if (!prev || (!live && !prev.name)) {
        installerOptionsById.set(raw.installerId, { id: raw.installerId, name });
      }
    }
    for (const row of masterSummaries) {
      if (row.installerId && !installerOptionsById.has(row.installerId)) {
        installerOptionsById.set(row.installerId, { id: row.installerId, name: row.name });
      }
    }

    const total = totalsRows[0]?.total ?? 0;

    return {
      data: rows.map((row) => ({
        id: row.id,
        packageId: row.packageId,
        installerId: row.installerId,
        installerName: row.installerLiveName ?? row.installerName,
        installerGrade: row.installerGrade,
        paidAt: isoDate(row.paidAt),
        amount: String(row.amount),
        paymentMethod: row.paymentMethod ?? null,
        note: row.note,
        direction: KIND_TO_DIRECTION_NAME[row.packageKind] ?? String(row.packageKind),
        packageStatus: String(row.packageStatus),
        contractNumber: row.contractNumber,
        customerName: row.customerName,
        objectAddress: row.objectAddress,
        createdBy: row.createdById
          ? {
              id: row.createdById,
              name:
                [row.createdByFirstName, row.createdByLastName].filter(Boolean).join(' ').trim() ||
                row.createdByEmail ||
                '—',
            }
          : null,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page,
      limit: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
      /** Выдано авансов за период (журнал с текущими фильтрами). */
      totalPaidInPeriod: round2(Number(totalsRows[0]?.totalPaid ?? 0)),
      directionSums: directionSumRows
        .map((row) => ({
          direction: KIND_TO_DIRECTION_NAME[row.kind] ?? String(row.kind),
          sum: round2(Number(row.sum)),
        }))
        .sort(
          (a, b) =>
            (PACKAGE_DIRECTION_REGISTRY.find((d) => d.name === a.direction)?.sortOrder ?? 99) -
            (PACKAGE_DIRECTION_REGISTRY.find((d) => d.name === b.direction)?.sortOrder ?? 99),
        ),
      /** Сводка по мастерам: начислено / выплачено / остаток (переплата-недоплата). */
      masters: masterSummaries,
      installers: [...installerOptionsById.values()].sort((a, b) =>
        a.name.localeCompare(b.name, 'ru'),
      ),
    };
  }

  /**
   * Поиск договора для формы выдачи аванса: живые пакеты по № договора / заказчику,
   * заключённые — вперёд. Мастера формы фильтруются по направлению выбранного договора.
   */
  async searchPackages(params?: { search?: string; limit?: number }) {
    const q = params?.search?.trim() ?? '';
    const take = Math.min(Math.max(params?.limit ?? 15, 1), 50);
    const pattern = q ? `%${escapeLike(q)}%` : '';
    const searchFilter = pattern
      ? Prisma.sql` AND (
          COALESCE(p."formData"->'contract'->>'number', '') ILIKE ${pattern}
          OR COALESCE(p."formData"->'customer'->>'fullName', '') ILIKE ${pattern}
        )`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        kind: ContractDocumentPackageKind;
        status: string;
        contractNumber: string | null;
        customerName: string | null;
        objectAddress: string | null;
      }>
    >(Prisma.sql`
      SELECT p."id", p."kind", p."status",
        p."formData"->'contract'->>'number' AS "contractNumber",
        p."formData"->'customer'->>'fullName' AS "customerName",
        p."formData"->'object'->>'objectAddress' AS "objectAddress"
      FROM contract_document_packages p
      WHERE p."deleted_at" IS NULL${searchFilter}
      ORDER BY (p."status" = 'CONTRACT_CONCLUDED') DESC, p."updatedAt" DESC
      LIMIT ${take}`);

    return rows.map((row) => ({
      id: row.id,
      kind: String(row.kind),
      direction: KIND_TO_DIRECTION_NAME[row.kind] ?? String(row.kind),
      status: String(row.status),
      contractNumber: row.contractNumber,
      customerName: row.customerName,
      objectAddress: row.objectAddress,
    }));
  }
}
