import { Injectable } from '@nestjs/common';
import { ContractDocumentPackageKind } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { InstallerSalarySummariesService } from '../installer-settlements/installer-salary-summaries.service';
import {
  type RepairScheduleAttachedInstaller,
  type RepairScheduleSalarySummary,
  extractAttachedInstallerIds,
} from './repair-schedule.shared';

/**
 * Дополнение строк план-графика данными пакета договора: прикреплённые
 * мастера (модалка «Заказ-наряды») и сводка з/п с выданными авансами.
 * Выделено из RepairSchedulesService, чтобы тот не разрастался.
 */
@Injectable()
export class RepairScheduleRowEnrichmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salarySummaries: InstallerSalarySummariesService,
  ) {}

  /** Дополняет проекты мастерами, прикреплёнными в модалке «Заказ-наряды» пакета. */
  async withContractInstallers<T extends { package?: { formData?: unknown } | null }>(
    rows: T[],
  ): Promise<Array<T & { attachedInstallers: RepairScheduleAttachedInstaller[] }>> {
    const idsByRow = rows.map((row) => extractAttachedInstallerIds(row.package?.formData));
    const allIds = [...new Set(idsByRow.flat())];
    const byId = new Map<string, RepairScheduleAttachedInstaller>();
    if (allIds.length > 0) {
      const installers = await this.prisma.installerMaster.findMany({
        where: { id: { in: allIds } },
        select: { id: true, fullName: true, grade: true },
      });
      for (const installer of installers) byId.set(installer.id, installer);
    }
    return rows.map((row, index) => ({
      ...row,
      attachedInstallers: idsByRow[index]
        .map((id) => byId.get(id))
        .filter((installer): installer is RepairScheduleAttachedInstaller => Boolean(installer)),
    }));
  }

  async withContractInstaller<T extends { package?: { formData?: unknown } | null }>(
    row: T,
  ): Promise<T & { attachedInstallers: RepairScheduleAttachedInstaller[] }> {
    return (await this.withContractInstallers([row]))[0];
  }

  /**
   * Сводка з/п по договорам списка план-графика: полная начисленная з/п
   * (сумма итогов заказ-нарядов мастеров — как на вкладке «Авансы» модалки
   * «Заказ-наряды») и выданные авансы с их долей от полной з/п.
   * Подключается только к спискам планировщика — «мои ремонты» мастера з/п не видят.
   */
  async withSalarySummaries<
    T extends {
      packageId: string | null;
      package?: { kind?: unknown; formData?: unknown } | null;
    },
  >(rows: T[]): Promise<Array<T & { salary: RepairScheduleSalarySummary | null }>> {
    const withPackage = rows.filter(
      (row): row is T & { packageId: string; package: { kind: unknown; formData?: unknown } } =>
        Boolean(row.packageId) && row.package != null && row.package.kind != null,
    );
    const salaryByPackage = await this.salarySummaries.byPackages(
      withPackage.map((row) => ({
        id: row.packageId,
        kind: row.package.kind as ContractDocumentPackageKind,
        formData: row.package.formData,
      })),
    );
    return rows.map((row) => ({
      ...row,
      salary: (row.packageId ? salaryByPackage.get(row.packageId) : undefined) ?? null,
    }));
  }
}
