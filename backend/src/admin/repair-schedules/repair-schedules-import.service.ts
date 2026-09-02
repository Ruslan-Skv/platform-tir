import { BadRequestException, Injectable } from '@nestjs/common';
import { RepairScheduleEntryKind, RepairScheduleProjectStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { parseRepairScheduleExcel } from './repair-schedule-excel.parser';
import {
  decimalOrNull,
  matchInstallerId,
  normalizeContractKey,
  parseDateOnly,
} from './repair-schedule.shared';

@Injectable()
export class RepairSchedulesImportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Импорт матрицы Excel/Google Sheets (.xlsx/.xls/.csv) за годы 2025–2026.
   * Upsert по № договора; еженедельные ячейки → записи WEEKLY.
   */
  async importFromExcel(buffer: Buffer, actorUserId: string, options?: { years?: number[] }) {
    const parsed = parseRepairScheduleExcel(buffer, {
      years: options?.years ?? [2025, 2026],
    });
    if (parsed.projects.length === 0) {
      throw new BadRequestException(
        'В файле не найдено проектов ремонта (проверьте лист и колонки 2025–2026)',
      );
    }

    const installers = await this.prisma.installerMaster.findMany({
      where: { directions: { has: 'REPAIR' } },
      select: { id: true, fullName: true },
    });

    const existing = await this.prisma.repairScheduleProject.findMany({
      where: { contractNumber: { not: null } },
      select: { id: true, contractNumber: true },
    });
    const byContract = new Map(
      existing
        .filter((p) => p.contractNumber)
        .map((p) => [normalizeContractKey(p.contractNumber), p.id]),
    );

    let created = 0;
    let updated = 0;
    let entriesUpserted = 0;

    for (const row of parsed.projects) {
      const installerId = matchInstallerId(row.installerName, installers);
      const contractKey = normalizeContractKey(row.contractNumber);
      const existingId = contractKey ? byContract.get(contractKey) : undefined;

      let projectId: string;
      if (existingId) {
        await this.prisma.repairScheduleProject.update({
          where: { id: existingId },
          data: {
            status: row.status,
            workScope: row.workScope,
            installerId,
            installerName: row.installerName,
            customerAddress: row.customerAddress,
            contractSum: decimalOrNull(row.contractSum) ?? undefined,
            payoutSum: decimalOrNull(row.payoutSum) ?? undefined,
            furnitureInfo: row.furnitureInfo,
            closedAt: row.status === RepairScheduleProjectStatus.CLOSED ? new Date() : null,
            updatedById: actorUserId,
          },
        });
        projectId = existingId;
        updated += 1;
      } else {
        const createdRow = await this.prisma.repairScheduleProject.create({
          data: {
            status: row.status,
            contractNumber: row.contractNumber,
            workScope: row.workScope,
            installerId,
            installerName: row.installerName,
            customerAddress: row.customerAddress,
            contractSum: decimalOrNull(row.contractSum) ?? null,
            payoutSum: decimalOrNull(row.payoutSum) ?? null,
            furnitureInfo: row.furnitureInfo,
            closedAt: row.status === RepairScheduleProjectStatus.CLOSED ? new Date() : null,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
        });
        projectId = createdRow.id;
        if (contractKey) byContract.set(contractKey, projectId);
        created += 1;
      }

      for (const entry of row.entries) {
        const date = parseDateOnly(entry.date);
        const existingEntry = await this.prisma.repairScheduleEntry.findFirst({
          where: { projectId, date },
          select: { id: true, text: true },
        });
        if (existingEntry) {
          if (existingEntry.text !== entry.text) {
            await this.prisma.repairScheduleEntry.update({
              where: { id: existingEntry.id },
              data: { text: entry.text, kind: RepairScheduleEntryKind.WEEKLY },
            });
            entriesUpserted += 1;
          }
        } else {
          await this.prisma.repairScheduleEntry.create({
            data: {
              projectId,
              date,
              kind: RepairScheduleEntryKind.WEEKLY,
              text: entry.text,
              createdById: actorUserId,
            },
          });
          entriesUpserted += 1;
        }
      }
    }

    return {
      sheetName: parsed.sheetName,
      weekColumns: parsed.weekColumns,
      projectsInFile: parsed.projects.length,
      skippedRows: parsed.skippedRows,
      created,
      updated,
      entriesUpserted,
    };
  }
}
