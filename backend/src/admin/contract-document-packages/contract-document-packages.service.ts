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

@Injectable()
export class ContractDocumentPackagesService {
  constructor(private readonly prisma: PrismaService) {}
  private static readonly EXECUTOR_PROFILES_TAB = 'executor_profiles';
  private static readonly SIGNATORY_PROFILES_TAB = 'signatory_profiles';
  private static readonly CONTRACT_TEMPLATES_TAB = 'contract_templates';
  private static readonly ESTIMATE_PRESETS_TAB = 'estimate_presets';
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
  ): Promise<void> {
    const ids = this.extractRepairEstimatePresetIds(formData);
    if (ids.length === 0) return;

    const others = await this.prisma.contractDocumentPackage.findMany({
      where: {
        kind: ContractDocumentPackageKind.REPAIR,
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

  async create(dto: CreateContractDocumentPackageDto, createdById?: string) {
    if (dto.crmContractId) {
      await this.assertCrmContractExists(dto.crmContractId);
    }
    if (dto.kind === ContractDocumentPackageKind.REPAIR && dto.formData !== undefined) {
      await this.assertRepairEstimatePresetsExclusive(null, dto.formData);
    }
    const created = await this.prisma.contractDocumentPackage.create({
      data: {
        kind: dto.kind,
        title: dto.title ?? null,
        formData: (dto.formData ?? {}) as Prisma.InputJsonValue,
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
      where: kind ? { kind } : undefined,
      orderBy: { updatedAt: 'desc' },
      include: contractDocumentPackageInclude,
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.contractDocumentPackage.findUnique({
      where: { id },
      include: contractDocumentPackageInclude,
    });
    if (!row) {
      throw new NotFoundException('Пакет документов не найден');
    }
    return row;
  }

  async update(id: string, dto: UpdateContractDocumentPackageDto, savedById?: string | null) {
    const row = await this.findOne(id);
    if (dto.crmContractId) {
      await this.assertCrmContractExists(dto.crmContractId);
    }
    if (dto.formData !== undefined && row.kind === ContractDocumentPackageKind.REPAIR) {
      await this.assertRepairEstimatePresetsExclusive(id, dto.formData);
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

  async restoreVersion(packageId: string, versionId: string, savedById?: string | null) {
    const pkg = await this.findOne(packageId);
    const ver = await this.prisma.contractDocumentPackageVersion.findFirst({
      where: { id: versionId, packageId },
    });
    if (!ver) {
      throw new NotFoundException('Версия не найдена');
    }
    if (ver.crmContractId) {
      await this.assertCrmContractExists(ver.crmContractId);
    }
    if (pkg.kind === ContractDocumentPackageKind.REPAIR) {
      await this.assertRepairEstimatePresetsExclusive(packageId, ver.formData);
    }
    await this.appendPackageVersion(
      packageId,
      {
        title: pkg.title,
        formData: pkg.formData as Prisma.InputJsonValue,
        crmContractId: pkg.crmContractId,
        status: pkg.status,
      },
      savedById ?? null,
    );
    return this.prisma.contractDocumentPackage.update({
      where: { id: packageId },
      data: {
        title: ver.title,
        formData: ver.formData as Prisma.InputJsonValue,
        crmContractId: ver.crmContractId,
        status: ver.status,
      },
      include: contractDocumentPackageInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contractDocumentPackage.delete({ where: { id } });
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

  async getGlobalContractTemplates(kind: ContractDocumentPackageKind) {
    const row = await this.prisma.contractDocumentGlobalTemplate.findUnique({
      where: {
        kind_tab: { kind, tab: ContractDocumentPackagesService.CONTRACT_TEMPLATES_TAB },
      },
      select: { html: true, updatedAt: true },
    });
    if (!row) {
      return { items: [] as ContractTemplatePresetDto[], updatedAt: null as string | null };
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

  private assertContractTemplatesProtectedRules(
    previous: ContractTemplatePresetDto[],
    incoming: ContractTemplatePresetDto[],
  ): void {
    const incomingById = new Map(incoming.map((it) => [it.id, it]));
    for (const prev of previous) {
      const wasProtected = Boolean(prev.isProtected) && !Boolean(prev.archived);
      if (!wasProtected) continue;
      const next = incomingById.get(prev.id);
      if (!next) {
        throw new BadRequestException(
          'Нельзя удалить защищённый шаблон из хранилища. Снимите защиту в библиотеке шаблонов, затем перенесите в архив или измените.',
        );
      }
      const nextProtected = Boolean(next.isProtected);
      const nextArchived = Boolean(next.archived);
      if (nextProtected && nextArchived) {
        throw new BadRequestException(
          'Нельзя архивировать защищённый шаблон, пока включена защита. Сначала снимите защиту.',
        );
      }
    }
  }

  async setGlobalContractTemplates(dto: SetGlobalContractTemplatesDto, updatedById?: string) {
    const previous = await this.getGlobalContractTemplates(dto.kind);
    this.assertContractTemplatesProtectedRules(previous.items, dto.items ?? []);
    const payload = JSON.stringify({ items: dto.items ?? [] });
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

  async getGlobalEstimatePresets(kind: ContractDocumentPackageKind) {
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
        updatedAt: null as string | null,
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
    const previous = await this.getGlobalEstimatePresets(dto.kind);
    const nextItems = dto.items ?? [];
    const nextGroups = dto.groups ?? [];
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
}
