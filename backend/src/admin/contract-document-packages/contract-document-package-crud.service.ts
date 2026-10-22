import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ContractDocumentPackageKind, ContractDocumentPackageStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ContractConcludedNotifyService } from '../../contract-concluded-notify/contract-concluded-notify.service';
import { ContractDocumentSigningService } from '../../contract-document-signing/contract-document-signing.service';
import { preserveRemoteSigningStateOnUpdate } from '../../contract-document-signing/stage/signing-state-preservation';
import { RepairScheduleFromPackageService } from '../repair-schedules/repair-schedule-from-package.service';
import { SalaryContractsSyncService } from '../salary/services/salary-contracts-sync.service';
import { contractDocumentPackageInclude } from './contract-package.include';
import {
  customerNameFromFormData,
  displayContractNumberFromFormData,
  extractEstimatePresetIds,
  extractSignatoryCrmUserId,
} from './form/contract-package-form-read';
import { CreateContractDocumentPackageDto } from './dto/create-contract-document-package.dto';
import { UpdateContractDocumentPackageDto } from './dto/update-contract-document-package.dto';
import { injectDefaultWorkPeriodIntoFormData } from './repair-contract-work-period';
import { buildPackageVersionKeyMoments } from './package-version-key-moments';
import { ContractDocumentPackageEstimatePresetsService } from './contract-document-package-estimate-presets.service';
import { ContractDocumentPackageKindSettingsService } from './contract-document-package-kind-settings.service';
import { ContractDocumentNumberingService } from '../../contract-document-numbering/contract-document-numbering.service';

@Injectable()
export class ContractDocumentPackageCrudService {
  private readonly logger = new Logger(ContractDocumentPackageCrudService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly estimatePresets: ContractDocumentPackageEstimatePresetsService,
    private readonly kindSettings: ContractDocumentPackageKindSettingsService,
    private readonly repairScheduleFromPackage: RepairScheduleFromPackageService,
    private readonly contractNumbering: ContractDocumentNumberingService,
    private readonly contractConcludedNotify: ContractConcludedNotifyService,
    private readonly signingSessions: ContractDocumentSigningService,
    private readonly salarySync: SalaryContractsSyncService,
  ) {}

  async create(dto: CreateContractDocumentPackageDto, createdById?: string) {
    const fromFormSignatory = extractSignatoryCrmUserId(dto.formData);
    const responsibleManagerId = await this.resolveResponsibleManagerId(
      dto.responsibleManagerId ?? fromFormSignatory,
      createdById,
    );
    let formDataInput: unknown = dto.formData ?? {};
    if (
      dto.kind === ContractDocumentPackageKind.REPAIR ||
      dto.kind === ContractDocumentPackageKind.WINDOWS ||
      dto.kind === ContractDocumentPackageKind.DOORS ||
      dto.kind === ContractDocumentPackageKind.BLINDS ||
      dto.kind === ContractDocumentPackageKind.CEILINGS ||
      dto.kind === ContractDocumentPackageKind.FURNITURE
    ) {
      const defaultDays = await this.kindSettings.resolveDefaultWorkPeriodDays(dto.kind);
      formDataInput = injectDefaultWorkPeriodIntoFormData(formDataInput, defaultDays);
    }
    await this.assertEstimatePresetsExclusive(null, formDataInput, {
      expectedKind: dto.kind,
    });
    const created = await this.prisma.contractDocumentPackage.create({
      data: {
        kind: dto.kind,
        title: dto.title ?? null,
        formData: formDataInput as Prisma.InputJsonValue,
        createdById: createdById ?? null,
        responsibleManagerId,
      },
      include: contractDocumentPackageInclude,
    });
    try {
      await this.contractNumbering.syncNumberAssignmentsForPackage(created.id, formDataInput);
    } catch (err) {
      await this.prisma.contractDocumentPackage
        .delete({ where: { id: created.id } })
        .catch(() => undefined);
      throw err;
    }
    await this.appendPackageVersion(
      created.id,
      {
        title: created.title,
        formData: created.formData as Prisma.InputJsonValue,
        status: created.status,
      },
      createdById ?? null,
    );
    return this.findOne(created.id);
  }

  async findOne(id: string, options?: { allowTrashed?: boolean }) {
    const row = await this.prisma.contractDocumentPackage.findUnique({
      where: { id },
      include: contractDocumentPackageInclude,
    });
    if (!row) {
      throw new NotFoundException('Пакет документов не найден');
    }
    if (row.deletedAt && !options?.allowTrashed) {
      throw new NotFoundException('Пакет документов не найден');
    }
    return row;
  }

  async findTrash(
    kind: ContractDocumentPackageKind,
    params?: { search?: string; page?: number; limit?: number },
  ) {
    const page = params?.page ?? 1;
    const limit = Math.min(Math.max(params?.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const searchNorm = params?.search?.trim().toLowerCase() ?? '';

    const rows = await this.prisma.contractDocumentPackage.findMany({
      where: { kind, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      include: {
        deletedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    const filtered = searchNorm
      ? rows.filter((pkg) => this.packageMatchesTrashSearch(pkg, searchNorm))
      : rows;
    const total = filtered.length;
    const pageRows = filtered.slice(skip, skip + limit);

    return {
      data: pageRows.map((pkg) => ({
        id: pkg.id,
        contractNumber: displayContractNumberFromFormData(pkg.formData),
        customerName: customerNameFromFormData(pkg.formData),
        title: pkg.title,
        deletedAt: pkg.deletedAt!.toISOString(),
        deletedBy: pkg.deletedBy,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async update(id: string, dto: UpdateContractDocumentPackageDto, savedById?: string | null) {
    const row = await this.findOne(id);
    if (dto.formData !== undefined) {
      await this.assertEstimatePresetsExclusive(id, dto.formData, {
        previousFormData: row.formData,
        expectedKind: row.kind,
      });
    }
    /**
     * Признаки подписания (contractConcludedAt, статусы Д/с, отметки актов, маркер
     * _remoteSigning) могли быть записаны ЭП-флоу уже после того, как отправляющая
     * сторона загрузила форму, — устаревшая форма редактора их не затирает.
     */
    const { formToUpdate, statusToUpdate } = await preserveRemoteSigningStateOnUpdate(this.prisma, {
      packageId: id,
      logger: this.logger,
      storedFormData: row.formData,
      incomingFormData: dto.formData,
      incomingStatus: dto.status,
      storedStatus: row.status,
    });

    const responsibleManagerId =
      dto.responsibleManagerId !== undefined
        ? await this.resolveResponsibleManagerId(dto.responsibleManagerId, null)
        : formToUpdate !== undefined
          ? await this.resolveResponsibleManagerId(
              extractSignatoryCrmUserId(formToUpdate) ?? row.responsibleManagerId,
              null,
            )
          : undefined;
    const recordVersion = dto.recordVersion === true;
    const becomingConcluded =
      statusToUpdate === ContractDocumentPackageStatus.CONTRACT_CONCLUDED &&
      row.status !== ContractDocumentPackageStatus.CONTRACT_CONCLUDED;

    if (becomingConcluded && row.kind === ContractDocumentPackageKind.REPAIR) {
      const effectiveForm = formToUpdate !== undefined ? formToUpdate : (row.formData ?? {});
      if (extractEstimatePresetIds(effectiveForm).length === 0) {
        throw new BadRequestException(
          'Договор «Ремонт» нельзя отметить подписанным без прикреплённой сметы (расчёта)',
        );
      }
    }

    let formDataToSave: Prisma.InputJsonValue | undefined =
      formToUpdate !== undefined ? (formToUpdate as Prisma.InputJsonValue) : undefined;
    if (becomingConcluded) {
      const baseForm = formToUpdate !== undefined ? formToUpdate : (row.formData ?? {});
      try {
        formDataToSave = (await this.contractNumbering.finalizeFormDataNumbersOnConclude(
          row.kind,
          baseForm,
          id,
        )) as Prisma.InputJsonValue;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Резерв номера при подписании пакета ${id} не выполнен: ${message}`);
        formDataToSave = baseForm as Prisma.InputJsonValue;
      }
    }

    if (formDataToSave !== undefined) {
      await this.contractNumbering.syncNumberAssignmentsForPackage(id, formDataToSave);
    }

    const updated = await this.prisma.contractDocumentPackage.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(formDataToSave !== undefined ? { formData: formDataToSave } : {}),
        ...(responsibleManagerId !== undefined ? { responsibleManagerId } : {}),
        ...(statusToUpdate !== undefined ? { status: statusToUpdate } : {}),
      },
      include: contractDocumentPackageInclude,
    });
    if (becomingConcluded) {
      this.contractConcludedNotify.onConcluded(updated, savedById);
      // Договор подписан вручную — отзываем активные сессии ЭП и чистим маркер
      // _remoteSigning, чтобы в списке не висело «На согласовании» рядом со «Подписан».
      try {
        await this.signingSessions.cancelActiveSessionsOnManualConclusion(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Отзыв сессий ЭП при ручном подписании пакета ${id} не выполнен: ${message}`,
        );
      }
    }
    if (recordVersion) {
      await this.appendPackageVersion(
        id,
        {
          title: updated.title,
          formData: updated.formData as Prisma.InputJsonValue,
          status: updated.status,
        },
        savedById ?? null,
      );
    }
    if (becomingConcluded && updated.kind === ContractDocumentPackageKind.REPAIR) {
      try {
        await this.repairScheduleFromPackage.ensureFromConcludedRepairPackage(
          updated.id,
          savedById ?? null,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Автосоздание проекта план-графика ремонта после подписания пакета ${updated.id} не удалось: ${message}`,
        );
      }
    }
    // Статус договора в списке мог измениться (акты/суммы) — двигаем проект план-графика.
    if (updated.kind === ContractDocumentPackageKind.REPAIR) {
      // Снимок проекта план-графика (номер, заказчик, суммы) обновляется из пакета,
      // чтобы правки договора не застывали в снимке на момент создания проекта.
      try {
        await this.repairScheduleFromPackage.refreshProjectsSnapshotFromPackage(updated.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Обновление снимка план-графика ремонта для пакета ${updated.id} не удалось: ${message}`,
        );
      }
      try {
        await this.repairScheduleFromPackage.syncProjectStatusFromPackage(
          updated.id,
          savedById ?? null,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Синхронизация статуса план-графика ремонта для пакета ${updated.id} не удалась: ${message}`,
        );
      }
    }
    // Событийная синхронизация договора в расчёт з/п (ошибки логируются внутри).
    void this.salarySync.syncPackageSafe(id);
    return this.findOne(id);
  }

  async listVersions(packageId: string) {
    await this.findOne(packageId);
    const versions = await this.prisma.contractDocumentPackageVersion.findMany({
      where: { packageId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        packageId: true,
        versionNumber: true,
        title: true,
        status: true,
        formData: true,
        createdAt: true,
        savedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    return versions.map(({ formData, ...compactVersion }, index) => {
      const previous = versions[index + 1] ?? null;
      const action = this.resolveVersionAction({ index, versions });
      const keyMoments = buildPackageVersionKeyMoments({
        previous: previous
          ? {
              title: previous.title,
              status: previous.status,
              formData: previous.formData,
            }
          : null,
        current: {
          title: compactVersion.title,
          status: compactVersion.status,
          formData,
        },
        action,
      });
      return {
        ...compactVersion,
        action,
        keyMoments,
      };
    });
  }

  async getVersion(packageId: string, versionId: string) {
    await this.findOne(packageId);
    const row = await this.prisma.contractDocumentPackageVersion.findFirst({
      where: { id: versionId, packageId },
      include: {
        savedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!row) {
      throw new NotFoundException('Версия не найдена');
    }
    return row;
  }

  async moveToTrash(id: string, actorUserId?: string) {
    const row = await this.findOne(id);
    if (row.deletedAt) {
      throw new BadRequestException('Договор уже в корзине');
    }
    const paymentCount = await this.prisma.contractDocumentPackagePayment.count({
      where: { packageId: id },
    });
    if (paymentCount > 0) {
      throw new BadRequestException(
        'Нельзя удалить пакет с зарегистрированными оплатами. Сначала удалите записи об оплатах.',
      );
    }
    const estimatePresetIds = extractEstimatePresetIds(row.formData);
    if (estimatePresetIds.length > 0) {
      throw new BadRequestException(
        'Нельзя удалить договор с прикреплённым расчётом. Сначала отвяжите его на вкладке сметы (счёт-заказа).',
      );
    }
    await this.contractNumbering.releaseNumberAssignmentsForPackage(id);
    await this.contractNumbering.releaseActiveHoldsForPackage(id);
    return this.prisma.contractDocumentPackage.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: actorUserId ?? null,
      },
      include: contractDocumentPackageInclude,
    });
  }

  async restoreFromTrash(id: string) {
    const row = await this.findOne(id, { allowTrashed: true });
    if (!row.deletedAt) {
      throw new BadRequestException('Договор не в корзине');
    }
    if (row.formData !== undefined) {
      await this.assertEstimatePresetsExclusive(id, row.formData);
    }
    await this.contractNumbering.syncNumberAssignmentsForPackage(id, row.formData);
    const restored = await this.prisma.contractDocumentPackage.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
      },
      include: contractDocumentPackageInclude,
    });
    // Событийная синхронизация договора в расчёт з/п (ошибки логируются внутри).
    void this.salarySync.syncPackageSafe(id);
    return restored;
  }

  async remove(id: string, actorUserId?: string) {
    return this.moveToTrash(id, actorUserId);
  }

  private async resolveResponsibleManagerId(
    candidateId: string | null | undefined,
    fallbackUserId?: string | null,
  ): Promise<string | null> {
    const trimmed = candidateId?.trim();
    const resolvedId = trimmed && trimmed.length > 0 ? trimmed : (fallbackUserId?.trim() ?? '');
    if (!resolvedId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: resolvedId },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('Указан несуществующий ответственный менеджер');
    }
    return user.id;
  }

  /**
   * Расчёт можно прикрепить только к одному пакету — любого направления.
   * Направление расчёта должно совпадать с направлением пакета (`expectedKind`).
   * Валидируются только новые привязки: у уже подписанных договоров сохранение
   * не падает из-за расчётов, привязанных до появления проверки направлений.
   */
  private async assertEstimatePresetsExclusive(
    currentPackageId: string | null,
    formData: unknown,
    options?: {
      previousFormData?: unknown;
      expectedKind?: ContractDocumentPackageKind;
    },
  ): Promise<void> {
    const ids = extractEstimatePresetIds(formData);
    if (ids.length === 0) return;

    const previousIds =
      options?.previousFormData !== undefined
        ? new Set(extractEstimatePresetIds(options.previousFormData))
        : null;
    // Валидируем только новые привязки: сохранение/снятие старых не должно падать
    // из-за двойных привязок, оставшихся в данных до кросс-видовой проверки.
    const addedIds = previousIds ? ids.filter((id) => !previousIds.has(id)) : ids;
    if (addedIds.length === 0) return;

    await this.estimatePresets.assertPipelineActive(addedIds, options?.expectedKind);

    const others = await this.prisma.contractDocumentPackage.findMany({
      where: {
        deletedAt: null,
        ...(currentPackageId ? { NOT: { id: currentPackageId } } : {}),
      },
      select: { id: true, formData: true },
    });
    for (const pkg of others) {
      const otherIds = extractEstimatePresetIds(pkg.formData);
      const conflict = addedIds.find((id) => otherIds.includes(id));
      if (conflict) {
        throw new BadRequestException(
          'Этот расчёт уже прикреплён к другому договору. Сначала отвяжите его в том пакете или выберите другой расчёт.',
        );
      }
    }
  }

  private packageMatchesTrashSearch(
    pkg: {
      title: string | null;
      formData: unknown;
    },
    searchNorm: string,
  ): boolean {
    const haystack = [
      displayContractNumberFromFormData(pkg.formData),
      customerNameFromFormData(pkg.formData),
      pkg.title ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(searchNorm);
  }

  /** Добавляет снимок пакета в журнал версий (без дублей подряд одинаковых). Публично для смежных сервисов модуля. */
  async appendPackageVersion(
    packageId: string,
    snapshot: {
      title: string | null;
      formData: Prisma.InputJsonValue;
      status: ContractDocumentPackageStatus;
    },
    savedById?: string | null,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const latest = await tx.contractDocumentPackageVersion.findFirst({
        where: { packageId },
        orderBy: { versionNumber: 'desc' },
        select: {
          title: true,
          formData: true,
          status: true,
        },
      });
      if (
        latest &&
        this.buildVersionSnapshotSignature(latest) === this.buildVersionSnapshotSignature(snapshot)
      ) {
        return;
      }
      const agg = await tx.contractDocumentPackageVersion.aggregate({
        where: { packageId },
        _max: { versionNumber: true },
      });
      const next = (agg._max.versionNumber ?? 0) + 1;
      await tx.contractDocumentPackageVersion.create({
        data: {
          packageId,
          versionNumber: next,
          title: snapshot.title,
          formData: snapshot.formData,
          status: snapshot.status,
          savedById: savedById ?? null,
        },
      });
    });
  }

  private buildVersionSnapshotSignature(snapshot: {
    title: string | null;
    status: ContractDocumentPackageStatus;
    formData: unknown;
  }): string {
    return JSON.stringify({
      title: snapshot.title ?? null,
      status: snapshot.status,
      formData: snapshot.formData ?? {},
    });
  }

  private resolveVersionAction(args: {
    index: number;
    versions: Array<{
      title: string | null;
      status: ContractDocumentPackageStatus;
      formData: unknown;
    }>;
  }): 'CREATE' | 'UPDATE' | 'ROLLBACK' {
    const { index, versions } = args;
    if (index === versions.length - 1) return 'CREATE';
    const current = versions[index];
    const currentSignature = this.buildVersionSnapshotSignature(current);
    for (let i = index + 2; i < versions.length; i += 1) {
      if (this.buildVersionSnapshotSignature(versions[i]) === currentSignature) {
        return 'ROLLBACK';
      }
    }
    return 'UPDATE';
  }
}
