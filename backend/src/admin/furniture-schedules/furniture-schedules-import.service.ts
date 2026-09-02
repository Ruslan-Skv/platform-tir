import { BadRequestException, Injectable } from '@nestjs/common';
import { FurnitureScheduleEntryKind, FurnitureScheduleProjectStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { parseFurnitureScheduleExcel } from './furniture-schedule-excel.parser';
import { matchInstallerId, normalizeContractKey, parseDateOnly } from './furniture-schedule.shared';

@Injectable()
export class FurnitureSchedulesImportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Импорт матрицы Excel/Google Sheets (.xlsx) вкладка «План-график».
   * Upsert по № договора изготовления; еженедельные ячейки → записи WEEKLY.
   */
  async importFromExcel(buffer: Buffer, actorUserId: string, options?: { years?: number[] }) {
    const parsed = parseFurnitureScheduleExcel(buffer, {
      years: options?.years ?? [2025, 2026],
    });
    if (parsed.projects.length === 0) {
      throw new BadRequestException(
        'В файле не найдено проектов мебели (проверьте вкладку «План-график» и колонки 2025–2026)',
      );
    }

    const installers = await this.prisma.installerMaster.findMany({
      where: { directions: { has: 'FURNITURE' } },
      select: { id: true, fullName: true },
    });

    const existing = await this.prisma.furnitureScheduleProject.findMany({
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

      const projectData = {
        status: row.status,
        contractNumber: row.contractNumber,
        installationContractNumber: row.installationContractNumber,
        appliancesContractNumber: row.appliancesContractNumber,
        repairInfo: row.repairInfo,
        reviewInfo: row.reviewInfo,
        installerId,
        installerName: row.installerName,
        customerAddress: row.customerAddress,
        workPeriodDays: row.workPeriodDays,
        contractDate: row.contractDate ? parseDateOnly(row.contractDate) : null,
        kzInfo: row.kzInfo,
        pauseStartDate: row.pauseStartDate ? parseDateOnly(row.pauseStartDate) : null,
        pauseResumeDate: row.pauseResumeDate ? parseDateOnly(row.pauseResumeDate) : null,
        workStartActDate: row.workStartActDate ? parseDateOnly(row.workStartActDate) : null,
        workCloseActDate: row.workCloseActDate ? parseDateOnly(row.workCloseActDate) : null,
        plannedStartDate: row.workStartActDate
          ? parseDateOnly(row.workStartActDate)
          : row.contractDate
            ? parseDateOnly(row.contractDate)
            : null,
        closedAt: row.status === FurnitureScheduleProjectStatus.CLOSED ? new Date() : null,
        updatedById: actorUserId,
      };

      let projectId: string;
      if (existingId) {
        await this.prisma.furnitureScheduleProject.update({
          where: { id: existingId },
          data: projectData,
        });
        projectId = existingId;
        updated += 1;
      } else {
        const createdRow = await this.prisma.furnitureScheduleProject.create({
          data: {
            ...projectData,
            createdById: actorUserId,
          },
        });
        projectId = createdRow.id;
        if (contractKey) byContract.set(contractKey, projectId);
        created += 1;
      }

      for (const entry of row.entries) {
        const date = parseDateOnly(entry.date);
        const existingEntry = await this.prisma.furnitureScheduleEntry.findFirst({
          where: { projectId, date },
          select: { id: true, text: true },
        });
        if (existingEntry) {
          if (existingEntry.text !== entry.text) {
            await this.prisma.furnitureScheduleEntry.update({
              where: { id: existingEntry.id },
              data: { text: entry.text, kind: FurnitureScheduleEntryKind.WEEKLY },
            });
            entriesUpserted += 1;
          }
        } else {
          await this.prisma.furnitureScheduleEntry.create({
            data: {
              projectId,
              date,
              kind: FurnitureScheduleEntryKind.WEEKLY,
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
