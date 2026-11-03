import { Injectable } from '@nestjs/common';
import { ContractDocumentPackageKind } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
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
 * полная начисленная з/п (итоги заказ-нарядов мастеров) и выданные авансы.
 * Один сервис на оба раздела — чтобы расчёт и округления не разъезжались.
 */
@Injectable()
export class InstallerSalarySummariesService {
  constructor(private readonly prisma: PrismaService) {}

  async byPackages(
    packages: Array<{ id: string; kind: ContractDocumentPackageKind; formData: unknown }>,
  ): Promise<Map<string, InstallerSalarySummary>> {
    const result = new Map<string, InstallerSalarySummary>();
    if (packages.length === 0) return result;

    const [advanceSums, installers, settingsRows] = await Promise.all([
      this.prisma.contractDocumentPackageInstallerAdvance.groupBy({
        by: ['packageId'],
        where: { packageId: { in: packages.map((p) => p.id) } },
        _sum: { amount: true },
      }),
      this.prisma.installerMaster.findMany({ select: { id: true, grade: true } }),
      this.prisma.contractDocumentRepairSettings.findMany({
        where: { kind: { in: [...PRODUCT_KINDS] } },
        select: { kind: true, windowsWorkOrderMarkupPercent: true },
      }),
    ]);

    const paidByPackage = new Map(
      advanceSums.map((row) => [row.packageId, row._sum.amount?.toNumber() ?? 0]),
    );
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
      result.set(pkg.id, summarizeInstallerSalary(accrued, paidByPackage.get(pkg.id) ?? 0));
    }
    return result;
  }
}
