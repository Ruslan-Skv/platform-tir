import { Injectable, Logger } from '@nestjs/common';
import {
  ContractDocumentPackageKind,
  ContractDocumentPackageStatus,
  Prisma,
  RepairScheduleProjectStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  computePackageListPipelineStatus,
  type PackageListPaymentRow,
} from '../contract-document-packages/list-pipeline/package-list-pipeline-status';
import {
  emptyToNull,
  pipelineStatusToProjectStatus,
  REPAIR_PROJECT_STATUS_RANK,
} from './repair-schedule.shared';
import { RepairSchedulesService } from './repair-schedules.service';

/** Пакет со всем, что нужно для сверки статуса договора с проектом план-графика. */
const REPAIR_PACKAGE_SYNC_SELECT = {
  id: true,
  kind: true,
  status: true,
  formData: true,
  createdById: true,
  responsibleManagerId: true,
  payments: {
    select: { amount: true, paymentType: true, addendumNumber: true, paymentDate: true },
  },
  repairScheduleProjects: {
    select: { id: true, status: true },
    orderBy: { createdAt: 'asc' as const },
    take: 1,
  },
} satisfies Prisma.ContractDocumentPackageSelect;

type LoadedRepairPackage = Prisma.ContractDocumentPackageGetPayload<{
  select: typeof REPAIR_PACKAGE_SYNC_SELECT;
}>;

type SyncStatusResult = {
  changed: boolean;
  projectId: string | null;
  status: RepairScheduleProjectStatus | null;
};

/**
 * Связка пакетов документов «Ремонт» с план-графиком:
 * при «Договор подписан» — проект в статусе «Новые договора»,
 * при смене статуса договора — проект переезжает в соответствующий раздел.
 */
@Injectable()
export class RepairScheduleFromPackageService {
  private readonly logger = new Logger(RepairScheduleFromPackageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repairSchedules: RepairSchedulesService,
  ) {}

  /**
   * Автозагрузка договоров «Ремонт» в план-график: создаёт проекты по всем
   * подписанным договорам, у которых проекта ещё нет (заключены раньше,
   * восстановлены из корзины или автосоздание при подписании не удалось),
   * и двигает статусы существующих проектов за статусами договоров.
   */
  async autoSyncFromConcludedRepairPackages(actorUserId?: string | null): Promise<{
    scannedPackages: number;
    created: number;
    createdProjectIds: string[];
    statusUpdated: number;
  }> {
    // Закрытые проекты дальше не двигаются — не грузим их на каждый заход.
    const packages = await this.prisma.contractDocumentPackage.findMany({
      where: {
        kind: ContractDocumentPackageKind.REPAIR,
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        deletedAt: null,
        OR: [
          { repairScheduleProjects: { none: {} } },
          { repairScheduleProjects: { some: { status: { not: 'CLOSED' } } } },
        ],
      },
      select: REPAIR_PACKAGE_SYNC_SELECT,
      orderBy: { createdAt: 'asc' },
    });

    const createdProjectIds: string[] = [];
    let statusUpdated = 0;
    for (const pkg of packages) {
      if (pkg.repairScheduleProjects.length === 0) {
        const res = await this.ensureFromConcludedRepairPackage(pkg.id, actorUserId, {
          notify: false,
        });
        if (res.created && res.projectId) createdProjectIds.push(res.projectId);
        continue;
      }
      const res = await this.advanceProjectStatusFromPackage(pkg, actorUserId, { notify: false });
      if (res.changed) statusUpdated++;
    }
    return {
      scannedPackages: packages.length,
      created: createdProjectIds.length,
      createdProjectIds,
      statusUpdated,
    };
  }

  async ensureFromConcludedRepairPackage(
    packageId: string,
    actorUserId?: string | null,
    options?: { notify?: boolean },
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
        options,
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

  /**
   * Синхронизация статуса проекта план-графика со статусом договора в списке
   * («Подписан» → «Новые», «В работе» → «В работе», «Закрыт» → «Закрытые»).
   */
  async syncProjectStatusFromPackage(
    packageId: string,
    actorUserId?: string | null,
    options?: { notify?: boolean },
  ): Promise<SyncStatusResult> {
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: packageId, deletedAt: null },
      select: REPAIR_PACKAGE_SYNC_SELECT,
    });
    if (!pkg) return { changed: false, projectId: null, status: null };
    return this.advanceProjectStatusFromPackage(pkg, actorUserId, options);
  }

  /** Двигает статус проекта вперёд по статусу договора; назад — никогда (ручные правки не откатываются). */
  private async advanceProjectStatusFromPackage(
    pkg: LoadedRepairPackage,
    actorUserId?: string | null,
    options?: { notify?: boolean },
  ): Promise<SyncStatusResult> {
    if (pkg.kind !== ContractDocumentPackageKind.REPAIR) {
      return { changed: false, projectId: null, status: null };
    }
    const project = pkg.repairScheduleProjects[0];
    if (!project) return { changed: false, projectId: null, status: null };

    const payments: PackageListPaymentRow[] = pkg.payments.map((p) => ({
      amount: p.amount.toString(),
      paymentType: p.paymentType,
      addendumNumber: p.addendumNumber,
      paymentDate: p.paymentDate,
    }));
    const pipeline = computePackageListPipelineStatus({
      kind: pkg.kind,
      status: pkg.status,
      formData: pkg.formData,
      payments,
    });
    const target = pipelineStatusToProjectStatus(pipeline);
    if (
      !target ||
      REPAIR_PROJECT_STATUS_RANK[target] <= REPAIR_PROJECT_STATUS_RANK[project.status]
    ) {
      return { changed: false, projectId: project.id, status: project.status };
    }

    const actorId = emptyToNull(actorUserId) ?? pkg.responsibleManagerId ?? pkg.createdById ?? null;
    try {
      await this.repairSchedules.setStatus(project.id, target, actorId, options);
      return { changed: true, projectId: project.id, status: target };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Не удалось синхронизировать статус план-графика ремонта для пакета ${pkg.id}: ${message}`,
      );
      return { changed: false, projectId: project.id, status: project.status };
    }
  }
}
