import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ContractDocumentPackageKind, ContractDocumentPackageStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { contractDocumentPackageInclude } from './contract-package.include';
import { CreateContractDocumentPackageDto } from './dto/create-contract-document-package.dto';
import {
  ExecutorProfileDto,
  SetGlobalExecutorProfilesDto,
} from './dto/set-global-executor-profiles.dto';
import {
  ContractTemplatePresetDto,
  SetGlobalContractTemplatesDto,
} from './dto/set-global-contract-templates.dto';
import {
  SetGlobalSignatoryProfilesDto,
  SignatoryProfileDto,
} from './dto/set-global-signatory-profiles.dto';
import {
  ContractEstimateGroupDto,
  ContractEstimatePresetDto,
  SetGlobalEstimatePresetsDto,
} from './dto/set-global-estimate-presets.dto';
import { SetGlobalContractTemplateDto } from './dto/set-global-contract-template.dto';
import { UpdateContractDocumentPackageDto } from './dto/update-contract-document-package.dto';
import {
  ApplyRepairWorkPeriodToAllDto,
  SetRepairContractSettingsDto,
} from './dto/set-repair-settings.dto';
import {
  DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS,
  injectDefaultWorkPeriodIntoFormData,
  setWorkPeriodInFormData,
} from './repair-contract-work-period';

@Injectable()
export class ContractDocumentPackagesService {
  constructor(private readonly prisma: PrismaService) {}
  private static readonly EXECUTOR_PROFILES_TAB = 'executor_profiles';
  private static readonly SIGNATORY_PROFILES_TAB = 'signatory_profiles';
  private static readonly CONTRACT_TEMPLATES_TAB = 'contract_templates';
  private static readonly ESTIMATE_PRESETS_TAB = 'estimate_presets';
  /** Срок хранения в корзине до безвозвратного удаления (расчёты, шаблоны). */
  static readonly ESTIMATE_PRESET_TRASH_RETENTION_DAYS = 30;
  static readonly CONTRACT_TEMPLATE_TRASH_RETENTION_DAYS = 30;
  private static readonly ESTIMATE_PRESET_TRASH_RETENTION_MS =
    ContractDocumentPackagesService.ESTIMATE_PRESET_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  private static readonly CONTRACT_TEMPLATE_TRASH_RETENTION_MS =
    ContractDocumentPackagesService.CONTRACT_TEMPLATE_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  private static readonly VERSION_MOMENT_FORM_DATA_UPDATED = 'packageFormDataUpdated';
  private static readonly VERSION_MOMENT_CUSTOMER_UPDATED = 'packageCustomerUpdated';
  private static readonly VERSION_MOMENT_ESTIMATE_UPDATED = 'packageEstimateUpdated';
  private static readonly VERSION_MOMENT_STATUS_UPDATED = 'packageStatusUpdated';
  private static readonly VERSION_MOMENT_TITLE_UPDATED = 'packageTitleUpdated';
  private static readonly VERSION_MOMENT_CRM_CONTRACT_UPDATED = 'packageCrmContractUpdated';
  private static readonly VERSION_MOMENT_ROLLBACK = 'packageRollbackApplied';

  private async assertCrmContractExists(contractId: string) {
    const row = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException('Указан несуществующий договор CRM');
    }
  }

  /** Id сохранённых расчётов из formData.estimate (мульти + legacy). */
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

  /**
   * Один расчёт (preset) не может быть прикреплён к двум пакетам ремонта одновременно.
   * @param currentPackageId пакет при update; null при create
   */
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
      await this.assertRepairEstimatePresetsPipelineActive(idsToValidatePipeline);
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

  /** Прикреплять к договору можно только расчёты со вкладки «В работе» (не архив, не перспектива). */
  private async assertRepairEstimatePresetsPipelineActive(presetIds: string[]): Promise<void> {
    const raw = await this.loadGlobalEstimatePresetsBlob(ContractDocumentPackageKind.REPAIR);
    const groupsById = new Map((raw.groups ?? []).map((g) => [g.id, g]));
    for (const id of presetIds) {
      const preset = raw.items.find((item) => item.id === id);
      if (!preset) continue;
      if (preset.archived) {
        throw new BadRequestException(
          'Нельзя прикрепить расчёт из архива. Восстановите его в списке расчётов.',
        );
      }
      if (preset.pipelineStage === 'prospect') {
        throw new BadRequestException(
          'Нельзя прикрепить расчёт из вкладки «В перспективе». Перенесите его в «В работе».',
        );
      }
      const group = preset.groupId ? groupsById.get(preset.groupId) : undefined;
      if (group?.archived) {
        throw new BadRequestException(
          'Нельзя прикрепить расчёт архивного объекта. Восстановите объект в списке расчётов.',
        );
      }
      if (group?.pipelineStage === 'prospect') {
        throw new BadRequestException(
          'Нельзя прикрепить расчёт объекта из вкладки «В перспективе». Перенесите объект в «В работе».',
        );
      }
    }
  }

  async create(dto: CreateContractDocumentPackageDto, createdById?: string) {
    if (dto.crmContractId) {
      await this.assertCrmContractExists(dto.crmContractId);
    }
    let formDataInput: unknown = dto.formData ?? {};
    if (dto.kind === ContractDocumentPackageKind.REPAIR) {
      const defaultDays = await this.resolveDefaultRepairWorkPeriodDays();
      formDataInput = injectDefaultWorkPeriodIntoFormData(formDataInput, defaultDays);
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
        crmContractId: dto.crmContractId ?? null,
      },
      include: contractDocumentPackageInclude,
    });
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

  findAll(kind?: ContractDocumentPackageKind) {
    return this.prisma.contractDocumentPackage.findMany({
      where: {
        deletedAt: null,
        ...(kind ? { kind } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        ...contractDocumentPackageInclude,
        _count: { select: { versions: true } },
      },
    });
  }

  private displayContractNumberFromFormData(formData: unknown): string {
    if (!formData || typeof formData !== 'object') return '—';
    const fd = formData as Record<string, unknown>;
    const contract =
      fd.contract && typeof fd.contract === 'object'
        ? (fd.contract as Record<string, unknown>)
        : null;
    const num = typeof contract?.number === 'string' ? contract.number.trim() : '';
    return num || '—';
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
    const recordVersion = dto.recordVersion === true;
    const updated = await this.prisma.contractDocumentPackage.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.formData !== undefined ? { formData: dto.formData as Prisma.InputJsonValue } : {}),
        ...(dto.crmContractId !== undefined ? { crmContractId: dto.crmContractId } : {}),
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
    return this.findOne(id);
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

  private asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private buildVersionKeyMoments(args: {
    previous: {
      title: string | null;
      status: ContractDocumentPackageStatus;
      crmContractId: string | null;
      formData: unknown;
    } | null;
    current: {
      title: string | null;
      status: ContractDocumentPackageStatus;
      crmContractId: string | null;
      formData: unknown;
    };
  }): string[] {
    const { previous, current } = args;
    if (!previous) {
      return ['packageCreated'];
    }

    const moments: string[] = [];
    if ((previous.title ?? null) !== (current.title ?? null)) {
      moments.push(ContractDocumentPackagesService.VERSION_MOMENT_TITLE_UPDATED);
    }
    if (previous.status !== current.status) {
      moments.push(ContractDocumentPackagesService.VERSION_MOMENT_STATUS_UPDATED);
    }
    if ((previous.crmContractId ?? null) !== (current.crmContractId ?? null)) {
      moments.push(ContractDocumentPackagesService.VERSION_MOMENT_CRM_CONTRACT_UPDATED);
    }

    const prevFormRaw = previous.formData ?? {};
    const nextFormRaw = current.formData ?? {};
    const prevFormText = JSON.stringify(prevFormRaw);
    const nextFormText = JSON.stringify(nextFormRaw);
    if (prevFormText !== nextFormText) {
      moments.push(ContractDocumentPackagesService.VERSION_MOMENT_FORM_DATA_UPDATED);
      const prevForm = this.asObject(prevFormRaw);
      const nextForm = this.asObject(nextFormRaw);
      if (JSON.stringify(prevForm.customer ?? {}) !== JSON.stringify(nextForm.customer ?? {})) {
        moments.push(ContractDocumentPackagesService.VERSION_MOMENT_CUSTOMER_UPDATED);
      }
      if (JSON.stringify(prevForm.estimate ?? {}) !== JSON.stringify(nextForm.estimate ?? {})) {
        moments.push(ContractDocumentPackagesService.VERSION_MOMENT_ESTIMATE_UPDATED);
      }
    }

    return moments.length
      ? moments
      : [ContractDocumentPackagesService.VERSION_MOMENT_FORM_DATA_UPDATED];
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
      const keyMoments = this.buildVersionKeyMoments({
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
      });
      return {
        ...compactVersion,
        action,
        keyMoments:
          action === 'ROLLBACK'
            ? [ContractDocumentPackagesService.VERSION_MOMENT_ROLLBACK, ...keyMoments]
            : keyMoments,
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
    return this.prisma.contractDocumentPackage.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
      },
      include: contractDocumentPackageInclude,
    });
  }

  /** @deprecated Используйте moveToTrash — сохранено для совместимости вызовов. */
  async remove(id: string, actorUserId?: string) {
    return this.moveToTrash(id, actorUserId);
  }

  private assertGlobalTab(tab: string) {
    const allowed = new Set([
      'contract',
      'actStart',
      'actAcceptance',
      'cashOrder',
      'questionnaire1',
      'questionnaire2',
      'addendum',
      'workOrder',
      'workOrderAddendum',
      'productionLog',
    ]);
    if (!allowed.has(tab)) {
      throw new BadRequestException(`Недопустимый tab: ${tab}`);
    }
  }

  async getGlobalTemplate(kind: ContractDocumentPackageKind, tab: string) {
    this.assertGlobalTab(tab);
    const row = await this.prisma.contractDocumentGlobalTemplate.findUnique({
      where: { kind_tab: { kind, tab } },
      select: { html: true, updatedAt: true, updatedById: true },
    });
    return {
      html: row?.html ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  async setGlobalTemplate(dto: SetGlobalContractTemplateDto, updatedById?: string) {
    const tab = dto.tab.trim();
    this.assertGlobalTab(tab);
    const row = await this.prisma.contractDocumentGlobalTemplate.upsert({
      where: { kind_tab: { kind: dto.kind, tab } },
      create: {
        kind: dto.kind,
        tab,
        html: dto.html,
        updatedById: updatedById ?? null,
      },
      update: {
        html: dto.html,
        updatedById: updatedById ?? null,
      },
      select: { id: true, kind: true, tab: true, updatedAt: true },
    });
    return row;
  }

  private isContractTemplateTrashed(item: ContractTemplatePresetDto): boolean {
    return Boolean(item.deletedAt?.trim());
  }

  private isContractTemplateTrashExpired(deletedAt: string | undefined): boolean {
    const trimmed = deletedAt?.trim();
    if (!trimmed) return false;
    const deletedMs = Date.parse(trimmed);
    if (!Number.isFinite(deletedMs)) return false;
    return (
      deletedMs < Date.now() - ContractDocumentPackagesService.CONTRACT_TEMPLATE_TRASH_RETENTION_MS
    );
  }

  private async loadGlobalContractTemplatesBlob(kind: ContractDocumentPackageKind): Promise<{
    items: ContractTemplatePresetDto[];
    updatedAt: string | null;
  }> {
    const row = await this.prisma.contractDocumentGlobalTemplate.findUnique({
      where: {
        kind_tab: { kind, tab: ContractDocumentPackagesService.CONTRACT_TEMPLATES_TAB },
      },
      select: { html: true, updatedAt: true },
    });
    if (!row) {
      return { items: [] as ContractTemplatePresetDto[], updatedAt: null };
    }
    try {
      const parsed = JSON.parse(row.html) as { items?: ContractTemplatePresetDto[] };
      return {
        items: Array.isArray(parsed?.items) ? parsed.items : [],
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch {
      return { items: [] as ContractTemplatePresetDto[], updatedAt: row.updatedAt.toISOString() };
    }
  }

  private async purgeExpiredTrashedContractTemplates(
    kind: ContractDocumentPackageKind,
  ): Promise<number> {
    const raw = await this.loadGlobalContractTemplatesBlob(kind);
    const nextItems = raw.items.filter(
      (item) =>
        !this.isContractTemplateTrashed(item) ||
        !this.isContractTemplateTrashExpired(item.deletedAt),
    );
    const purged = raw.items.length - nextItems.length;
    if (purged === 0) return 0;
    const payload = JSON.stringify({ items: nextItems });
    await this.prisma.contractDocumentGlobalTemplate.upsert({
      where: {
        kind_tab: { kind, tab: ContractDocumentPackagesService.CONTRACT_TEMPLATES_TAB },
      },
      create: {
        kind,
        tab: ContractDocumentPackagesService.CONTRACT_TEMPLATES_TAB,
        html: payload,
        updatedById: null,
      },
      update: { html: payload },
      select: { id: true },
    });
    return purged;
  }

  private contractTemplateTabLabel(tabId: string | undefined): string {
    const labels: Record<string, string> = {
      contract: 'Договор',
      actStart: 'Акт начала работ',
      actAcceptance: 'Акт сдачи-приёмки',
      cashOrder: 'ПКО',
      productionLog: 'Производственный журнал',
    };
    const key = tabId?.trim() || 'contract';
    return labels[key] ?? key;
  }

  private contractTemplateMatchesTrashSearch(
    item: ContractTemplatePresetDto,
    searchNorm: string,
  ): boolean {
    const haystack = [item.title, this.contractTemplateTabLabel(item.tabId), item.tabId ?? '']
      .join(' ')
      .toLowerCase();
    return haystack.includes(searchNorm);
  }

  async getGlobalContractTemplates(kind: ContractDocumentPackageKind) {
    await this.purgeExpiredTrashedContractTemplates(kind);
    const raw = await this.loadGlobalContractTemplatesBlob(kind);
    return {
      items: raw.items.filter((item) => !this.isContractTemplateTrashed(item)),
      updatedAt: raw.updatedAt,
    };
  }

  async findContractTemplatesTrash(
    kind: ContractDocumentPackageKind,
    params?: { search?: string; page?: number; limit?: number },
  ) {
    await this.purgeExpiredTrashedContractTemplates(kind);
    const raw = await this.loadGlobalContractTemplatesBlob(kind);
    const page = params?.page ?? 1;
    const limit = Math.min(Math.max(params?.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const searchNorm = params?.search?.trim().toLowerCase() ?? '';

    let trashed = raw.items.filter((item) => this.isContractTemplateTrashed(item));
    trashed.sort((a, b) => {
      const ta = Date.parse(a.deletedAt ?? '') || 0;
      const tb = Date.parse(b.deletedAt ?? '') || 0;
      return tb - ta;
    });

    if (searchNorm) {
      trashed = trashed.filter((item) => this.contractTemplateMatchesTrashSearch(item, searchNorm));
    }

    const total = trashed.length;
    const pageRows = trashed.slice(skip, skip + limit);

    const userIds = [
      ...new Set(
        pageRows.map((row) => row.deletedById?.trim()).filter((id): id is string => Boolean(id)),
      ),
    ];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, firstName: true, lastName: true },
          })
        : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    return {
      data: pageRows.map((item) => {
        const deletedById = item.deletedById?.trim() ?? null;
        const deletedBy = deletedById ? (userById.get(deletedById) ?? null) : null;
        const deletedMs = Date.parse(item.deletedAt ?? '');
        const permanentDeleteAt = Number.isFinite(deletedMs)
          ? new Date(
              deletedMs + ContractDocumentPackagesService.CONTRACT_TEMPLATE_TRASH_RETENTION_MS,
            ).toISOString()
          : null;
        return {
          id: item.id,
          title: item.title,
          tabId: item.tabId ?? 'contract',
          tabLabel: this.contractTemplateTabLabel(item.tabId),
          deletedAt: item.deletedAt!,
          permanentDeleteAt,
          deletedBy,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      trashRetentionDays: ContractDocumentPackagesService.CONTRACT_TEMPLATE_TRASH_RETENTION_DAYS,
    };
  }

  async trashContractTemplate(
    kind: ContractDocumentPackageKind,
    presetId: string,
    actorUserId?: string,
  ) {
    await this.purgeExpiredTrashedContractTemplates(kind);
    const raw = await this.loadGlobalContractTemplatesBlob(kind);
    const index = raw.items.findIndex((item) => item.id === presetId);
    if (index < 0) {
      throw new NotFoundException('Шаблон не найден');
    }
    const item = raw.items[index];
    if (this.isContractTemplateTrashed(item)) {
      throw new BadRequestException('Шаблон уже в корзине');
    }
    const nextItems = [...raw.items];
    nextItems[index] = {
      ...item,
      deletedAt: new Date().toISOString(),
      deletedById: actorUserId ?? undefined,
      archived: false,
      isDefault: false,
    };
    await this.setGlobalContractTemplates({ kind, items: nextItems }, actorUserId);
    return { ok: true };
  }

  async restoreContractTemplateFromTrash(
    kind: ContractDocumentPackageKind,
    presetId: string,
    updatedById?: string,
  ) {
    await this.purgeExpiredTrashedContractTemplates(kind);
    const raw = await this.loadGlobalContractTemplatesBlob(kind);
    const index = raw.items.findIndex((item) => item.id === presetId);
    if (index < 0) {
      throw new NotFoundException('Шаблон не найден');
    }
    const item = raw.items[index];
    if (!this.isContractTemplateTrashed(item)) {
      throw new BadRequestException('Шаблон не в корзине');
    }
    const nextItems = [...raw.items];
    const restored = { ...item };
    delete restored.deletedAt;
    delete restored.deletedById;
    nextItems[index] = restored;
    await this.setGlobalContractTemplates({ kind, items: nextItems }, updatedById);
    return { ok: true };
  }

  async setGlobalContractTemplates(dto: SetGlobalContractTemplatesDto, updatedById?: string) {
    await this.purgeExpiredTrashedContractTemplates(dto.kind);
    const previousRaw = await this.loadGlobalContractTemplatesBlob(dto.kind);
    const previousTrashedItems = previousRaw.items.filter((item) =>
      this.isContractTemplateTrashed(item),
    );
    const dtoItems = dto.items ?? [];
    const activeFromDto = dtoItems
      .filter((item) => !this.isContractTemplateTrashed(item))
      .map((item) => {
        const copy = { ...item };
        delete copy.deletedAt;
        delete copy.deletedById;
        return copy;
      });
    const trashedFromDto = dtoItems.filter((item) => this.isContractTemplateTrashed(item));
    const activeIds = new Set(activeFromDto.map((item) => item.id));
    const trashedFromDtoIds = new Set(trashedFromDto.map((item) => item.id));
    const preservedTrash = previousTrashedItems.filter(
      (item) => !activeIds.has(item.id) && !trashedFromDtoIds.has(item.id),
    );
    const nextItems = [...activeFromDto, ...trashedFromDto, ...preservedTrash];
    const payload = JSON.stringify({ items: nextItems });
    const row = await this.prisma.contractDocumentGlobalTemplate.upsert({
      where: {
        kind_tab: { kind: dto.kind, tab: ContractDocumentPackagesService.CONTRACT_TEMPLATES_TAB },
      },
      create: {
        kind: dto.kind,
        tab: ContractDocumentPackagesService.CONTRACT_TEMPLATES_TAB,
        html: payload,
        updatedById: updatedById ?? null,
      },
      update: {
        html: payload,
        updatedById: updatedById ?? null,
      },
      select: { id: true, kind: true, tab: true, updatedAt: true },
    });
    return row;
  }

  async getGlobalExecutorProfiles(kind: ContractDocumentPackageKind) {
    const row = await this.prisma.contractDocumentGlobalTemplate.findUnique({
      where: {
        kind_tab: { kind, tab: ContractDocumentPackagesService.EXECUTOR_PROFILES_TAB },
      },
      select: { html: true, updatedAt: true },
    });

    if (!row) {
      return { items: [] as ExecutorProfileDto[], updatedAt: null as string | null };
    }

    try {
      const parsed = JSON.parse(row.html) as { items?: ExecutorProfileDto[] };
      return {
        items: Array.isArray(parsed?.items) ? parsed.items : [],
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch {
      return { items: [] as ExecutorProfileDto[], updatedAt: row.updatedAt.toISOString() };
    }
  }

  async setGlobalExecutorProfiles(dto: SetGlobalExecutorProfilesDto, updatedById?: string) {
    const payload = JSON.stringify({ items: dto.items ?? [] });
    const row = await this.prisma.contractDocumentGlobalTemplate.upsert({
      where: {
        kind_tab: { kind: dto.kind, tab: ContractDocumentPackagesService.EXECUTOR_PROFILES_TAB },
      },
      create: {
        kind: dto.kind,
        tab: ContractDocumentPackagesService.EXECUTOR_PROFILES_TAB,
        html: payload,
        updatedById: updatedById ?? null,
      },
      update: {
        html: payload,
        updatedById: updatedById ?? null,
      },
      select: { id: true, kind: true, tab: true, updatedAt: true },
    });
    return row;
  }

  async getGlobalSignatoryProfiles(kind: ContractDocumentPackageKind) {
    const row = await this.prisma.contractDocumentGlobalTemplate.findUnique({
      where: {
        kind_tab: { kind, tab: ContractDocumentPackagesService.SIGNATORY_PROFILES_TAB },
      },
      select: { html: true, updatedAt: true },
    });

    if (!row) {
      return { items: [] as SignatoryProfileDto[], updatedAt: null as string | null };
    }

    try {
      const parsed = JSON.parse(row.html) as { items?: SignatoryProfileDto[] };
      return {
        items: Array.isArray(parsed?.items) ? parsed.items : [],
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch {
      return { items: [] as SignatoryProfileDto[], updatedAt: row.updatedAt.toISOString() };
    }
  }

  async setGlobalSignatoryProfiles(dto: SetGlobalSignatoryProfilesDto, updatedById?: string) {
    const payload = JSON.stringify({ items: dto.items ?? [] });
    const row = await this.prisma.contractDocumentGlobalTemplate.upsert({
      where: {
        kind_tab: { kind: dto.kind, tab: ContractDocumentPackagesService.SIGNATORY_PROFILES_TAB },
      },
      create: {
        kind: dto.kind,
        tab: ContractDocumentPackagesService.SIGNATORY_PROFILES_TAB,
        html: payload,
        updatedById: updatedById ?? null,
      },
      update: {
        html: payload,
        updatedById: updatedById ?? null,
      },
      select: { id: true, kind: true, tab: true, updatedAt: true },
    });
    return row;
  }

  private isEstimatePresetTrashed(item: ContractEstimatePresetDto): boolean {
    return Boolean(item.deletedAt?.trim());
  }

  private isEstimatePresetTrashExpired(deletedAt: string | undefined): boolean {
    const trimmed = deletedAt?.trim();
    if (!trimmed) return false;
    const deletedMs = Date.parse(trimmed);
    if (!Number.isFinite(deletedMs)) return false;
    return (
      deletedMs < Date.now() - ContractDocumentPackagesService.ESTIMATE_PRESET_TRASH_RETENTION_MS
    );
  }

  /** Безвозвратно удаляет расчёты из корзины, лежащие дольше срока хранения. */
  private async purgeExpiredTrashedEstimatePresets(
    kind: ContractDocumentPackageKind,
  ): Promise<number> {
    const raw = await this.loadGlobalEstimatePresetsBlob(kind);
    const nextItems = raw.items.filter(
      (item) =>
        !this.isEstimatePresetTrashed(item) || !this.isEstimatePresetTrashExpired(item.deletedAt),
    );
    const purged = raw.items.length - nextItems.length;
    if (purged === 0) return 0;
    const payload = JSON.stringify({
      items: nextItems,
      groups: raw.groups,
    });
    await this.prisma.contractDocumentGlobalTemplate.upsert({
      where: {
        kind_tab: { kind, tab: ContractDocumentPackagesService.ESTIMATE_PRESETS_TAB },
      },
      create: {
        kind,
        tab: ContractDocumentPackagesService.ESTIMATE_PRESETS_TAB,
        html: payload,
        updatedById: null,
      },
      update: {
        html: payload,
      },
      select: { id: true },
    });
    return purged;
  }

  private async loadGlobalEstimatePresetsBlob(kind: ContractDocumentPackageKind): Promise<{
    items: ContractEstimatePresetDto[];
    groups: ContractEstimateGroupDto[];
    updatedAt: string | null;
  }> {
    const row = await this.prisma.contractDocumentGlobalTemplate.findUnique({
      where: {
        kind_tab: { kind, tab: ContractDocumentPackagesService.ESTIMATE_PRESETS_TAB },
      },
      select: { html: true, updatedAt: true },
    });
    if (!row) {
      return {
        items: [] as ContractEstimatePresetDto[],
        groups: [] as ContractEstimateGroupDto[],
        updatedAt: null,
      };
    }
    try {
      const parsed = JSON.parse(row.html) as {
        items?: ContractEstimatePresetDto[];
        groups?: ContractEstimateGroupDto[];
      };
      return {
        items: Array.isArray(parsed?.items) ? parsed.items : [],
        groups: Array.isArray(parsed?.groups) ? parsed.groups : [],
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch {
      return {
        items: [] as ContractEstimatePresetDto[],
        groups: [] as ContractEstimateGroupDto[],
        updatedAt: row.updatedAt.toISOString(),
      };
    }
  }

  private estimatePresetMatchesTrashSearch(
    item: ContractEstimatePresetDto,
    groups: ContractEstimateGroupDto[],
    searchNorm: string,
  ): boolean {
    const groupTitle = item.groupId ? (groups.find((g) => g.id === item.groupId)?.title ?? '') : '';
    const haystack = [item.title, item.categoryName, item.categorySlug, groupTitle]
      .join(' ')
      .toLowerCase();
    return haystack.includes(searchNorm);
  }

  async getGlobalEstimatePresets(kind: ContractDocumentPackageKind) {
    await this.purgeExpiredTrashedEstimatePresets(kind);
    const raw = await this.loadGlobalEstimatePresetsBlob(kind);
    return {
      items: raw.items.filter((item) => !this.isEstimatePresetTrashed(item)),
      groups: raw.groups,
      updatedAt: raw.updatedAt,
    };
  }

  async findEstimatePresetsTrash(
    kind: ContractDocumentPackageKind,
    params?: { search?: string; page?: number; limit?: number },
  ) {
    await this.purgeExpiredTrashedEstimatePresets(kind);
    const raw = await this.loadGlobalEstimatePresetsBlob(kind);
    const page = params?.page ?? 1;
    const limit = Math.min(Math.max(params?.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const searchNorm = params?.search?.trim().toLowerCase() ?? '';

    let trashed = raw.items.filter((item) => this.isEstimatePresetTrashed(item));
    trashed.sort((a, b) => {
      const ta = Date.parse(a.deletedAt ?? '') || 0;
      const tb = Date.parse(b.deletedAt ?? '') || 0;
      return tb - ta;
    });

    if (searchNorm) {
      trashed = trashed.filter((item) =>
        this.estimatePresetMatchesTrashSearch(item, raw.groups, searchNorm),
      );
    }

    const total = trashed.length;
    const pageRows = trashed.slice(skip, skip + limit);

    const userIds = [
      ...new Set(
        pageRows.map((row) => row.deletedById?.trim()).filter((id): id is string => Boolean(id)),
      ),
    ];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, firstName: true, lastName: true },
          })
        : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    return {
      data: pageRows.map((item) => {
        const deletedById = item.deletedById?.trim() ?? null;
        const deletedBy = deletedById ? (userById.get(deletedById) ?? null) : null;
        const group = item.groupId ? raw.groups.find((g) => g.id === item.groupId) : undefined;
        const deletedMs = Date.parse(item.deletedAt ?? '');
        const permanentDeleteAt = Number.isFinite(deletedMs)
          ? new Date(
              deletedMs + ContractDocumentPackagesService.ESTIMATE_PRESET_TRASH_RETENTION_MS,
            ).toISOString()
          : null;
        return {
          id: item.id,
          title: item.title,
          categoryName: item.categoryName,
          groupTitle: group?.title ?? null,
          deletedAt: item.deletedAt!,
          permanentDeleteAt,
          deletedBy,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      trashRetentionDays: ContractDocumentPackagesService.ESTIMATE_PRESET_TRASH_RETENTION_DAYS,
    };
  }

  async trashEstimatePreset(
    kind: ContractDocumentPackageKind,
    presetId: string,
    actorUserId?: string,
  ) {
    await this.purgeExpiredTrashedEstimatePresets(kind);
    const raw = await this.loadGlobalEstimatePresetsBlob(kind);
    const index = raw.items.findIndex((item) => item.id === presetId);
    if (index < 0) {
      throw new NotFoundException('Расчёт не найден');
    }
    const item = raw.items[index];
    if (this.isEstimatePresetTrashed(item)) {
      throw new BadRequestException('Расчёт уже в корзине');
    }
    const nextItems = [...raw.items];
    nextItems[index] = {
      ...item,
      deletedAt: new Date().toISOString(),
      deletedById: actorUserId ?? undefined,
    };
    await this.setGlobalEstimatePresets(
      { kind, items: nextItems, groups: raw.groups },
      actorUserId,
    );
    return { ok: true };
  }

  async restoreEstimatePresetFromTrash(kind: ContractDocumentPackageKind, presetId: string) {
    const raw = await this.loadGlobalEstimatePresetsBlob(kind);
    const index = raw.items.findIndex((item) => item.id === presetId);
    if (index < 0) {
      throw new NotFoundException('Расчёт не найден');
    }
    const item = raw.items[index];
    if (!this.isEstimatePresetTrashed(item)) {
      throw new BadRequestException('Расчёт не в корзине');
    }
    const nextItems = [...raw.items];
    const restored = { ...item };
    delete restored.deletedAt;
    delete restored.deletedById;
    nextItems[index] = restored;
    await this.setGlobalEstimatePresets({ kind, items: nextItems, groups: raw.groups });
    return { ok: true };
  }

  private buildEstimatePresetsChangedFields(args: {
    previousItems: ContractEstimatePresetDto[];
    previousGroups: ContractEstimateGroupDto[];
    nextItems: ContractEstimatePresetDto[];
    nextGroups: ContractEstimateGroupDto[];
  }): string[] {
    const { previousItems, previousGroups, nextItems, nextGroups } = args;
    const changed: string[] = [];
    if (previousItems.length !== nextItems.length) {
      changed.push('estimateItemsCountChanged');
    }
    if (previousGroups.length !== nextGroups.length) {
      changed.push('estimateGroupsCountChanged');
    }
    if (JSON.stringify(previousItems) !== JSON.stringify(nextItems)) {
      changed.push('estimateItemsUpdated');
    }
    if (JSON.stringify(previousGroups) !== JSON.stringify(nextGroups)) {
      changed.push('estimateGroupsUpdated');
    }
    return changed.length > 0 ? changed : ['estimateDataUpdated'];
  }

  async listGlobalEstimatePresetsHistory(kind: ContractDocumentPackageKind) {
    let rows: Array<{
      id: string;
      kind: ContractDocumentPackageKind;
      changedFields: string[];
      action: string;
      changedAt: Date;
      changedById: string | null;
      changedByEmail: string | null;
      changedByFirstName: string | null;
      changedByLastName: string | null;
    }> = [];
    try {
      rows = await this.prisma.$queryRaw<
        Array<{
          id: string;
          kind: ContractDocumentPackageKind;
          changedFields: string[];
          action: string;
          changedAt: Date;
          changedById: string | null;
          changedByEmail: string | null;
          changedByFirstName: string | null;
          changedByLastName: string | null;
        }>
      >(Prisma.sql`
        SELECT
          h.id,
          h.kind,
          h.changed_fields as "changedFields",
          h.action,
          h.changed_at as "changedAt",
          u.id as "changedById",
          u.email as "changedByEmail",
          u.first_name as "changedByFirstName",
          u.last_name as "changedByLastName"
        FROM contract_document_estimate_presets_history h
        LEFT JOIN users u ON u.id = h.changed_by_id
        WHERE h.kind = ${kind}
        ORDER BY h.changed_at DESC
      `);
    } catch {
      // Таблица истории могла ещё не быть применена миграцией — не валим UI.
      return [];
    }
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      changedFields: Array.isArray(row.changedFields) ? row.changedFields : [],
      action: row.action,
      changedAt: row.changedAt,
      changedBy: row.changedById
        ? {
            id: row.changedById,
            email: row.changedByEmail ?? '',
            firstName: row.changedByFirstName,
            lastName: row.changedByLastName,
          }
        : null,
    }));
  }

  async setGlobalEstimatePresets(dto: SetGlobalEstimatePresetsDto, updatedById?: string) {
    const previousRaw = await this.loadGlobalEstimatePresetsBlob(dto.kind);
    const previousTrashedItems = previousRaw.items.filter((item) =>
      this.isEstimatePresetTrashed(item),
    );
    const dtoItems = dto.items ?? [];
    const activeFromDto = dtoItems
      .filter((item) => !this.isEstimatePresetTrashed(item))
      .map((item) => {
        const copy = { ...item };
        delete copy.deletedAt;
        delete copy.deletedById;
        return copy;
      });
    const trashedFromDto = dtoItems.filter((item) => this.isEstimatePresetTrashed(item));
    const activeIds = new Set(activeFromDto.map((item) => item.id));
    const trashedFromDtoIds = new Set(trashedFromDto.map((item) => item.id));
    const preservedTrash = previousTrashedItems.filter(
      (item) => !activeIds.has(item.id) && !trashedFromDtoIds.has(item.id),
    );
    const nextItems = [...activeFromDto, ...trashedFromDto, ...preservedTrash];
    const nextGroups = dto.groups ?? previousRaw.groups;
    const previous = {
      items: previousRaw.items.filter((item) => !this.isEstimatePresetTrashed(item)),
      groups: previousRaw.groups,
      updatedAt: previousRaw.updatedAt,
    };
    const changedFields = this.buildEstimatePresetsChangedFields({
      previousItems: previous.items,
      previousGroups: previous.groups,
      nextItems,
      nextGroups,
    });
    const action: 'CREATE' | 'UPDATE' = previous.updatedAt ? 'UPDATE' : 'CREATE';
    const payload = JSON.stringify({
      items: nextItems,
      groups: nextGroups,
    });
    const row = await this.prisma.contractDocumentGlobalTemplate.upsert({
      where: {
        kind_tab: { kind: dto.kind, tab: ContractDocumentPackagesService.ESTIMATE_PRESETS_TAB },
      },
      create: {
        kind: dto.kind,
        tab: ContractDocumentPackagesService.ESTIMATE_PRESETS_TAB,
        html: payload,
        updatedById: updatedById ?? null,
      },
      update: {
        html: payload,
        updatedById: updatedById ?? null,
      },
      select: { id: true, kind: true, tab: true, updatedAt: true },
    });
    try {
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO contract_document_estimate_presets_history
          (id, kind, items, groups, changed_fields, action, changed_by_id, changed_at)
        VALUES
          (
            ${randomUUID()},
            ${dto.kind}::"ContractDocumentPackageKind",
            ${JSON.stringify(nextItems)}::jsonb,
            ${JSON.stringify(nextGroups)}::jsonb,
            ${changedFields}::text[],
            ${action},
            ${updatedById ?? null},
            NOW()
          )
      `);
    } catch {
      // Не блокируем сохранение расчётов, если таблица истории ещё не создана.
    }
    return row;
  }

  async resolveDefaultRepairWorkPeriodDays(): Promise<number> {
    const row = await this.prisma.contractDocumentRepairSettings.findUnique({
      where: { kind: ContractDocumentPackageKind.REPAIR },
      select: { defaultWorkPeriodDays: true },
    });
    const days = row?.defaultWorkPeriodDays ?? DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS;
    return Number.isFinite(days) && days >= 1
      ? Math.trunc(days)
      : DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS;
  }

  async getRepairSettings() {
    const days = await this.resolveDefaultRepairWorkPeriodDays();
    const row = await this.prisma.contractDocumentRepairSettings.findUnique({
      where: { kind: ContractDocumentPackageKind.REPAIR },
      select: { updatedAt: true },
    });
    return {
      defaultWorkPeriodDays: days,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  async setRepairSettings(dto: SetRepairContractSettingsDto, updatedById?: string) {
    const row = await this.prisma.contractDocumentRepairSettings.upsert({
      where: { kind: ContractDocumentPackageKind.REPAIR },
      create: {
        kind: ContractDocumentPackageKind.REPAIR,
        defaultWorkPeriodDays: dto.defaultWorkPeriodDays,
        updatedById: updatedById ?? null,
      },
      update: {
        defaultWorkPeriodDays: dto.defaultWorkPeriodDays,
        updatedById: updatedById ?? null,
      },
      select: { defaultWorkPeriodDays: true, updatedAt: true },
    });
    return {
      defaultWorkPeriodDays: row.defaultWorkPeriodDays,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async applyRepairWorkPeriodToAllPackages(dto: ApplyRepairWorkPeriodToAllDto) {
    const packages = await this.prisma.contractDocumentPackage.findMany({
      where: {
        kind: ContractDocumentPackageKind.REPAIR,
        deletedAt: null,
      },
      select: { id: true, formData: true },
    });
    let updated = 0;
    for (const pkg of packages) {
      const next = setWorkPeriodInFormData(pkg.formData, dto.workPeriodDays);
      await this.prisma.contractDocumentPackage.update({
        where: { id: pkg.id },
        data: { formData: next as Prisma.InputJsonValue },
      });
      updated += 1;
    }
    return { updated, workPeriodDays: dto.workPeriodDays };
  }
}
