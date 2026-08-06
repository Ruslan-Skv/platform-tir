import { Injectable, Logger } from '@nestjs/common';
import {
  ContractDocumentPackageKind,
  ContractDocumentPackageStatus,
  RepairScheduleProjectStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { emptyToNull } from './repair-schedule.shared';
import { RepairSchedulesService } from './repair-schedules.service';

/**
 * Связка пакетов документов «Ремонт» с план-графиком:
 * при «Договор подписан» — проект в статусе «Новые договора».
 */
@Injectable()
export class RepairScheduleFromPackageService {
  private readonly logger = new Logger(RepairScheduleFromPackageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repairSchedules: RepairSchedulesService,
  ) {}

  async ensureFromConcludedRepairPackage(
    packageId: string,
    actorUserId?: string | null,
  ): Promise<{ created: boolean; projectId: string | null }> {
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: packageId, deletedAt: null },
      select: {
        id: true,
        kind: true,
        status: true,
        createdById: true,
        responsibleManagerId: true,
      },
    });
    if (!pkg) return { created: false, projectId: null };
    if (pkg.kind !== ContractDocumentPackageKind.REPAIR) {
      return { created: false, projectId: null };
    }
    if (pkg.status !== ContractDocumentPackageStatus.CONTRACT_CONCLUDED) {
      return { created: false, projectId: null };
    }

    const existing = await this.prisma.repairScheduleProject.findFirst({
      where: { packageId: pkg.id },
      select: { id: true },
    });
    if (existing) return { created: false, projectId: existing.id };

    const createdById =
      emptyToNull(actorUserId) ?? pkg.responsibleManagerId ?? pkg.createdById ?? null;

    try {
      const project = await this.repairSchedules.create(
        {
          status: RepairScheduleProjectStatus.NEW,
          packageId: pkg.id,
        },
        createdById,
      );
      return { created: true, projectId: project.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Не удалось автосоздать проект план-графика ремонта для пакета ${pkg.id}: ${message}`,
      );
      return { created: false, projectId: null };
    }
  }
}
