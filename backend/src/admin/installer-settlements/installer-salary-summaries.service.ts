import { Injectable } from '@nestjs/common';
import { ContractDocumentPackageKind } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  type InstallerSalaryAdvanceRow,
  type InstallerSalarySummary,
  computeInstallerAccrual,
  isProductLikeKind,
  normalizeProductMarkupPercent,
  summarizeInstallerSalary,
} from './installer-accrual';

/** Товарные направления: наценка заказ-наряда для з/п берётся из настроек направления. */
const PRODUCT_KINDS = [
  ContractDocumentPackageKind.WINDOWS,
  ContractDocumentPackageKind.DOORS,
  ContractDocumentPackageKind.BLINDS,
  ContractDocumentPackageKind.CEILINGS,
] as const;

/**
 * Сводки з/п по договорам для колонок «З/п» план-графиков (ремонт, ОДПЖ):
 * полная начисленная з/п (итоги заказ-нарядов мастеров), выданные авансы
 * и их журнал (подсказка колонки). Один сервис на оба раздела — чтобы расчёт
 * и округления не разъезжались.
 */
@Injectable()
export class InstallerSalarySummariesService {
  constructor(private readonly prisma: PrismaService) {}

  async byPackages(
    packages: Array<{ id: string; kind: ContractDocumentPackageKind; formData: unknown }>,
  ): Promise<Map<string, InstallerSalarySummary>> {
    const result = new Map<string, InstallerSalarySummary>();
    if (packages.length === 0) return result;

    const [advanceRows, installers, settingsRows] = await Promise.all([
      this.prisma.contractDocumentPackageInstallerAdvance.findMany({
        where: { packageId: { in: packages.map((p) => p.id) } },
        select: {
          id: true,
          packageId: true,
          installerId: true,
          installerName: true,
          paidAt: true,
          amount: true,
          paymentMethod: true,
          note: true,
          createdBy: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.installerMaster.findMany({ select: { id: true, fullName: true, grade: true } }),
      this.prisma.contractDocumentRepairSettings.findMany({
        where: { kind: { in: [...PRODUCT_KINDS] } },
        select: { kind: true, windowsWorkOrderMarkupPercent: true },
      }),
    ]);

    // Суммы выплат и журналы по договорам; живое имя мастера приоритетнее снимка записи.
    const liveNameById = new Map(installers.map((installer) => [installer.id, installer.fullName]));
    const paidByPackage = new Map<string, number>();
    const journalByPackage = new Map<string, InstallerSalaryAdvanceRow[]>();
    for (const row of advanceRows) {
      const amount = row.amount.toNumber();
      paidByPackage.set(row.packageId, (paidByPackage.get(row.packageId) ?? 0) + amount);
      const journal = journalByPackage.get(row.packageId) ?? [];
      journal.push({
        id: row.id,
        paidAt: row.paidAt.toISOString().slice(0, 10),
        amount,
        installerName:
          (row.installerId ? liveNameById.get(row.installerId) : null) ?? row.installerName ?? null,
        paymentMethod: row.paymentMethod,
        note: row.note,
        createdByName: row.createdBy
          ? [row.createdBy.firstName, row.createdBy.lastName].filter(Boolean).join(' ').trim() ||
            row.createdBy.email
          : null,
      });
      journalByPackage.set(row.packageId, journal);
    }

    const installerGradeById = new Map(
      installers.map((installer) => [installer.id, installer.grade]),
    );
    const productMarkupByKind = new Map(
      settingsRows.map((row) => [
        row.kind,
        normalizeProductMarkupPercent(row.windowsWorkOrderMarkupPercent ?? undefined),
      ]),
    );

    for (const pkg of packages) {
      const accrued = computeInstallerAccrual({
        kind: pkg.kind,
        formData: pkg.formData,
        ...(isProductLikeKind(pkg.kind)
          ? { productMarkupPercent: productMarkupByKind.get(pkg.kind) }
          : {}),
        installerGradeById,
      });
      result.set(
        pkg.id,
        summarizeInstallerSalary(
          accrued,
          paidByPackage.get(pkg.id) ?? 0,
          journalByPackage.get(pkg.id) ?? [],
        ),
      );
    }
    return result;
  }
}
