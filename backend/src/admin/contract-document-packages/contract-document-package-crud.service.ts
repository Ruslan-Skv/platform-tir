import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ContractDocumentPackageKind, ContractDocumentPackageStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RepairScheduleFromPackageService } from '../repair-schedules/repair-schedule-from-package.service';
import { contractDocumentPackageInclude } from './contract-package.include';
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
  ) {}

  async create(dto: CreateContractDocumentPackageDto, createdById?: string) {
    if (dto.crmContractId) {
      await this.assertCrmContractExists(dto.crmContractId);
    }
    const fromFormSignatory = this.extractSignatoryCrmUserId(dto.formData);
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
    if (dto.kind === ContractDocumentPackageKind.REPAIR) {
      await this.assertRepairEstimatePresetsExclusive(null, formDataInput);
    } else if (dto.formData !== undefined) {
      await this.assertRepairEstimatePresetsExclusive(null, dto.formData);
    }
    const created = await this.prisma.contractDocumentPackage.create({
      data: {
        kind: dto.kind,
        title: dto.title ?? null,
        formData: formDataInput as Prisma.InputJsonValue,
        createdById: createdById ?? null,
        responsibleManagerId,
        crmContractId: dto.crmContractId ?? null,
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
        crmContractId: created.crmContractId,
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
        crmContract: {
          select: {
            customerName: true,
          },
        },
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
        contractNumber: this.displayContractNumberFromFormData(pkg.formData),
        customerName: this.customerNameFromFormData(pkg.formData),
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
    if (dto.crmContractId) {
      await this.assertCrmContractExists(dto.crmContractId);
    }
    if (dto.formData !== undefined && row.kind === ContractDocumentPackageKind.REPAIR) {
      await this.assertRepairEstimatePresetsExclusive(id, dto.formData, {
        previousFormData: row.formData,
      });
    }
    const responsibleManagerId =
      dto.responsibleManagerId !== undefined
        ? await this.resolveResponsibleManagerId(dto.responsibleManagerId, null)
        : dto.formData !== undefined
          ? await this.resolveResponsibleManagerId(
              this.extractSignatoryCrmUserId(dto.formData) ?? row.responsibleManagerId,
              null,
            )
          : undefined;
    const recordVersion = dto.recordVersion === true;
    const becomingConcluded =
      dto.status === ContractDocumentPackageStatus.CONTRACT_CONCLUDED &&
      row.status !== ContractDocumentPackageStatus.CONTRACT_CONCLUDED;

    if (becomingConcluded && row.kind === ContractDocumentPackageKind.REPAIR) {
      const effectiveForm =
        dto.formData !== undefined ? dto.formData : row.formData !== undefined ? row.formData : {};
      if (this.extractRepairEstimatePresetIds(effectiveForm).length === 0) {
        throw new BadRequestException(
          'Договор «Ремонт» нельзя отметить подписанным без прикреплённой сметы (расчёта)',
        );
      }
    }

    let formDataToSave: Prisma.InputJsonValue | undefined =
      dto.formData !== undefined ? (dto.formData as Prisma.InputJsonValue) : undefined;
    if (becomingConcluded) {
      const baseForm =
        dto.formData !== undefined ? dto.formData : row.formData !== undefined ? row.formData : {};
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
        ...(dto.crmContractId !== undefined ? { crmContractId: dto.crmContractId } : {}),
        ...(responsibleManagerId !== undefined ? { responsibleManagerId } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: contractDocumentPackageInclude,
    });
    if (recordVersion) {
      await this.appendPackageVersion(
        id,
        {
          title: updated.title,
          formData: updated.formData as Prisma.InputJsonValue,
          crmContractId: updated.crmContractId,
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
        crmContractId: true,
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
              crmContractId: previous.crmContractId,
              formData: previous.formData,
            }
          : null,
        current: {
          title: compactVersion.title,
          status: compactVersion.status,
          crmContractId: compactVersion.crmContractId,
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
    if (row.kind === ContractDocumentPackageKind.REPAIR) {
      const paymentCount = await this.prisma.contractDocumentPackagePayment.count({
        where: { packageId: id },
      });
      if (paymentCount > 0) {
        throw new BadRequestException(
          'Нельзя удалить пакет с зарегистрированными оплатами. Сначала удалите записи об оплатах.',
        );
      }
      const estimatePresetIds = this.extractRepairEstimatePresetIds(row.formData);
      if (estimatePresetIds.length > 0) {
        throw new BadRequestException(
          'Нельзя удалить договор с прикреплённой сметой. Сначала отвяжите расчёты на вкладке «Смета».',
        );
      }
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
    if (row.kind === ContractDocumentPackageKind.REPAIR && row.formData !== undefined) {
      await this.assertRepairEstimatePresetsExclusive(id, row.formData);
    }
    await this.contractNumbering.syncNumberAssignmentsForPackage(id, row.formData);
    return this.prisma.contractDocumentPackage.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
      },
      include: contractDocumentPackageInclude,
    });
  }

  async remove(id: string, actorUserId?: string) {
    return this.moveToTrash(id, actorUserId);
  }

  private async assertCrmContractExists(contractId: string) {
    const row = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException('Указан несуществующий договор CRM');
    }
  }

  private extractSignatoryCrmUserId(formData: unknown): string | null {
    if (!formData || typeof formData !== 'object') return null;
    const executor = (formData as Record<string, unknown>).executor;
    if (!executor || typeof executor !== 'object') return null;
    const id = (executor as Record<string, unknown>).signatoryCrmUserId;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
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

  private extractRepairEstimatePresetIds(formData: unknown): string[] {
    if (!formData || typeof formData !== 'object') return [];
    const est = (formData as Record<string, unknown>).estimate;
    if (!est || typeof est !== 'object') return [];
    const e = est as Record<string, unknown>;
    const ids: string[] = [];
    if (typeof e.selectedPresetId === 'string' && e.selectedPresetId.trim()) {
      ids.push(e.selectedPresetId.trim());
    }
    if (Array.isArray(e.selectedPresetIds)) {
      for (const x of e.selectedPresetIds) {
        if (typeof x === 'string' && x.trim()) ids.push(x.trim());
      }
    }
    return [...new Set(ids)];
  }

  private async assertRepairEstimatePresetsExclusive(
    currentPackageId: string | null,
    formData: unknown,
    options?: { previousFormData?: unknown },
  ): Promise<void> {
    const ids = this.extractRepairEstimatePresetIds(formData);
    if (ids.length === 0) return;

    const previousIdsList =
      options?.previousFormData !== undefined
        ? this.extractRepairEstimatePresetIds(options.previousFormData)
        : null;
    if (previousIdsList !== null) {
      const previousSet = new Set(previousIdsList);
      const unchanged =
        ids.length === previousIdsList.length && ids.every((id) => previousSet.has(id));
      if (unchanged) return;
    }

    const previousIds = previousIdsList !== null ? new Set(previousIdsList) : null;
    const idsToValidatePipeline = previousIds ? ids.filter((id) => !previousIds.has(id)) : ids;
    if (idsToValidatePipeline.length > 0) {
      await this.estimatePresets.assertPipelineActive(idsToValidatePipeline);
    }

    const others = await this.prisma.contractDocumentPackage.findMany({
      where: {
        kind: ContractDocumentPackageKind.REPAIR,
        deletedAt: null,
        ...(currentPackageId ? { NOT: { id: currentPackageId } } : {}),
      },
      select: { id: true, formData: true },
    });
    for (const pkg of others) {
      const otherIds = this.extractRepairEstimatePresetIds(pkg.formData);
      const conflict = ids.find((id) => otherIds.includes(id));
      if (conflict) {
        throw new BadRequestException(
          'Этот расчёт уже прикреплён к другому договору. Сначала отвяжите его в том пакете или выберите другой расчёт.',
        );
      }
    }
  }

  private displayContractNumberFromFormData(formData: unknown): string {
    if (!formData || typeof formData !== 'object') return '—';
    const fd = formData as Record<string, unknown>;
    const contract =
      fd.contract && typeof fd.contract === 'object'
        ? (fd.contract as Record<string, unknown>)
        : null;
    const num = typeof contract?.number === 'string' ? contract.number.trim() : '';
    if (num) return num;
    const furniture = fd.furniture;
    if (furniture && typeof furniture === 'object') {
      const legs = furniture as Record<string, unknown>;
      const parts: string[] = [];
      for (const key of ['manufacture', 'montage', 'appliances'] as const) {
        const leg = legs[key];
        if (!leg || typeof leg !== 'object') continue;
        const enabled = (leg as { enabled?: unknown }).enabled;
        if (key !== 'manufacture' && enabled !== true) continue;
        const legContract = (leg as { contract?: unknown }).contract;
        if (!legContract || typeof legContract !== 'object') continue;
        const legNum = (legContract as { number?: unknown }).number;
        if (typeof legNum === 'string' && legNum.trim()) parts.push(legNum.trim());
      }
      if (parts.length > 0) return parts.join(' / ');
    }
    return '—';
  }

  private customerNameFromFormData(formData: unknown): string {
    if (!formData || typeof formData !== 'object') return '—';
    const fd = formData as Record<string, unknown>;
    const c =
      fd.customer && typeof fd.customer === 'object'
        ? (fd.customer as Record<string, unknown>)
        : null;
    if (!c) return '—';
    const type = c.type;
    if (type === 'COMPANY' || type === 'ENTREPRENEUR') {
      const org = typeof c.organizationName === 'string' ? c.organizationName.trim() : '';
      return org || '—';
    }
    const full = typeof c.fullName === 'string' ? c.fullName.trim() : '';
    return full || '—';
  }

  private packageMatchesTrashSearch(
    pkg: {
      title: string | null;
      formData: unknown;
      crmContract: { customerName: string | null } | null;
    },
    searchNorm: string,
  ): boolean {
    const haystack = [
      this.displayContractNumberFromFormData(pkg.formData),
      this.customerNameFromFormData(pkg.formData),
      pkg.crmContract?.customerName ?? '',
      pkg.title ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(searchNorm);
  }

  private async appendPackageVersion(
    packageId: string,
    snapshot: {
      title: string | null;
      formData: Prisma.InputJsonValue;
      crmContractId: string | null;
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
          crmContractId: true,
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
          crmContractId: snapshot.crmContractId,
          status: snapshot.status,
          savedById: savedById ?? null,
        },
      });
    });
  }

  private buildVersionSnapshotSignature(snapshot: {
    title: string | null;
    status: ContractDocumentPackageStatus;
    crmContractId: string | null;
    formData: unknown;
  }): string {
    return JSON.stringify({
      title: snapshot.title ?? null,
      status: snapshot.status,
      crmContractId: snapshot.crmContractId ?? null,
      formData: snapshot.formData ?? {},
    });
  }

  private resolveVersionAction(args: {
    index: number;
    versions: Array<{
      title: string | null;
      status: ContractDocumentPackageStatus;
      crmContractId: string | null;
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
