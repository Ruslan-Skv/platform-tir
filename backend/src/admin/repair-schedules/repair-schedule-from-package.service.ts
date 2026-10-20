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
  decimalOrNull,
  emptyToNull,
  extractPackageProjectSnapshot,
  pipelineStatusToProjectStatus,
  REPAIR_PROJECT_STATUS_RANK,
} from './repair-schedule.shared';
import { RepairSchedulesService } from './repair-schedules.service';

/** Пакет со всем, что нужно для сверки статуса договора с проектами план-графика. */
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
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ContractDocumentPackageSelect;

type LoadedRepairPackage = Prisma.ContractDocumentPackageGetPayload<{
  select: typeof REPAIR_PACKAGE_SYNC_SELECT;
}>;

type SyncStatusResult = {
  changed: boolean;
  changedCount: number;
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
          { repairScheduleProjects: { some: { deletedAt: null, status: { not: 'CLOSED' } } } },
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
      statusUpdated += res.changedCount;
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
      // Гонка: параллельный запрос успел создать проект первым — возвращаем его.
      const winner = await this.prisma.repairScheduleProject.findFirst({
        where: { packageId: pkg.id, deletedAt: null },
        select: { id: true },
      });
      if (winner) return { created: false, projectId: winner.id };
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
    if (!pkg) return { changed: false, changedCount: 0, projectId: null, status: null };
    return this.advanceProjectStatusFromPackage(pkg, actorUserId, options);
  }

  /** Двигает статус проекта вперёд по статусу договора; назад — никогда (ручные правки не откатываются). */
  private async advanceProjectStatusFromPackage(
    pkg: LoadedRepairPackage,
    actorUserId?: string | null,
    options?: { notify?: boolean },
  ): Promise<SyncStatusResult> {
    if (pkg.kind !== ContractDocumentPackageKind.REPAIR) {
      return { changed: false, changedCount: 0, projectId: null, status: null };
    }
    const projects = pkg.repairScheduleProjects;
    if (projects.length === 0) {
      return { changed: false, changedCount: 0, projectId: null, status: null };
    }

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

    // Двигаем каждый незакрытый проект пакета, а не только самый старый:
    // дубль, созданный до защиты от гонок, не должен навсегда зависнуть в «Новых».
    const actorId = emptyToNull(actorUserId) ?? pkg.responsibleManagerId ?? pkg.createdById ?? null;
    let changedCount = 0;
    let lastChanged: { id: string; status: RepairScheduleProjectStatus } | null = null;
    for (const project of projects) {
      if (
        !target ||
        REPAIR_PROJECT_STATUS_RANK[target] <= REPAIR_PROJECT_STATUS_RANK[project.status]
      ) {
        continue;
      }
      try {
        await this.repairSchedules.setStatus(project.id, target, actorId, options);
        changedCount++;
        lastChanged = { id: project.id, status: target };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Не удалось синхронизировать статус план-графика ремонта для пакета ${pkg.id} (проект ${project.id}): ${message}`,
        );
      }
    }
    return {
      changed: changedCount > 0,
      changedCount,
      projectId: lastChanged?.id ?? projects[0].id,
      status: lastChanged?.status ?? projects[0].status,
    };
  }

  /**
   * Обновляет снимок полей действующих проектов пакета (номер договора,
   * заказчик, суммы, срок) из текущего formData. Вызывается при сохранении
   * пакета, чтобы правки договора отражались в план-графике, а не застывали
   * в снимке на момент создания проекта.
   */
  async refreshProjectsSnapshotFromPackage(packageId: string): Promise<number> {
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: packageId, deletedAt: null },
      select: { kind: true, formData: true },
    });
    if (!pkg || pkg.kind !== ContractDocumentPackageKind.REPAIR) return 0;

    const snap = extractPackageProjectSnapshot(pkg.formData);
    const result = await this.prisma.repairScheduleProject.updateMany({
      where: { packageId, deletedAt: null },
      data: {
        ...(snap.contractNumber ? { contractNumber: snap.contractNumber } : {}),
        ...(snap.customerName ? { customerName: snap.customerName } : {}),
        ...(snap.customerAddress ? { customerAddress: snap.customerAddress } : {}),
        ...(snap.customerPhone ? { customerPhone: snap.customerPhone } : {}),
        ...(snap.contractSum != null
          ? { contractSum: decimalOrNull(snap.contractSum) ?? null }
          : {}),
        ...(snap.payoutSum != null ? { payoutSum: decimalOrNull(snap.payoutSum) ?? null } : {}),
        ...(snap.workPeriodDays != null ? { workPeriodDays: snap.workPeriodDays } : {}),
      },
    });
    return result.count;
  }
}
