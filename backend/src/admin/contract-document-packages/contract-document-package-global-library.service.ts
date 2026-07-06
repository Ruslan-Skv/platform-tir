import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractDocumentPackageKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
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
import { SetGlobalContractTemplateDto } from './dto/set-global-contract-template.dto';

const CONTRACT_TEMPLATES_TAB = 'contract_templates';
const EXECUTOR_PROFILES_TAB = 'executor_profiles';
const SIGNATORY_PROFILES_TAB = 'signatory_profiles';
const CONTRACT_TEMPLATE_TRASH_RETENTION_DAYS = 30;
const CONTRACT_TEMPLATE_TRASH_RETENTION_MS =
  CONTRACT_TEMPLATE_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

@Injectable()
export class ContractDocumentPackageGlobalLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  private assertGlobalTab(tab: string) {
    const allowed = new Set([
      'contract',
      'consent',
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

  /** Убирает legacy-поля из JSON (например isProtected из seed), чтобы не ломать PUT и хранилище. */
  private sanitizeContractTemplatePresetItem(
    item: ContractTemplatePresetDto,
  ): ContractTemplatePresetDto {
    const tabId = item.tabId?.trim();
    const deletedAt = item.deletedAt?.trim();
    const deletedById = item.deletedById?.trim();
    const out: ContractTemplatePresetDto = {
      id: item.id,
      title: item.title,
      html: item.html,
    };
    if (tabId) out.tabId = tabId;
    if (item.isDefault != null) out.isDefault = Boolean(item.isDefault);
    if (item.archived != null) out.archived = Boolean(item.archived);
    if (deletedAt) out.deletedAt = deletedAt;
    if (deletedById) out.deletedById = deletedById;
    return out;
  }

  private isContractTemplateTrashed(item: ContractTemplatePresetDto): boolean {
    return Boolean(item.deletedAt?.trim());
  }

  private isContractTemplateTrashExpired(deletedAt: string | undefined): boolean {
    const trimmed = deletedAt?.trim();
    if (!trimmed) return false;
    const deletedMs = Date.parse(trimmed);
    if (!Number.isFinite(deletedMs)) return false;
    return deletedMs < Date.now() - CONTRACT_TEMPLATE_TRASH_RETENTION_MS;
  }

  private async loadGlobalContractTemplatesBlob(kind: ContractDocumentPackageKind): Promise<{
    items: ContractTemplatePresetDto[];
    updatedAt: string | null;
  }> {
    const row = await this.prisma.contractDocumentGlobalTemplate.findUnique({
      where: {
        kind_tab: { kind, tab: CONTRACT_TEMPLATES_TAB },
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
        kind_tab: { kind, tab: CONTRACT_TEMPLATES_TAB },
      },
      create: {
        kind,
        tab: CONTRACT_TEMPLATES_TAB,
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
      consent: 'Согласие',
      actStart: 'Акт начала работ',
      actAcceptance: 'Акт сдачи-приёмки',
      deliveryNote: 'Накладная',
      memo: 'Памятка',
      cashOrder: 'ПКО',
      paymentInvoice: 'Счёт на оплату',
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
      items: raw.items
        .filter((item) => !this.isContractTemplateTrashed(item))
        .map((item) => this.sanitizeContractTemplatePresetItem(item)),
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
          ? new Date(deletedMs + CONTRACT_TEMPLATE_TRASH_RETENTION_MS).toISOString()
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
      trashRetentionDays: CONTRACT_TEMPLATE_TRASH_RETENTION_DAYS,
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
    const nextItems = [...activeFromDto, ...trashedFromDto, ...preservedTrash].map((item) =>
      this.sanitizeContractTemplatePresetItem(item),
    );
    const payload = JSON.stringify({ items: nextItems });
    const row = await this.prisma.contractDocumentGlobalTemplate.upsert({
      where: {
        kind_tab: { kind: dto.kind, tab: CONTRACT_TEMPLATES_TAB },
      },
      create: {
        kind: dto.kind,
        tab: CONTRACT_TEMPLATES_TAB,
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
        kind_tab: { kind, tab: EXECUTOR_PROFILES_TAB },
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
        kind_tab: { kind: dto.kind, tab: EXECUTOR_PROFILES_TAB },
      },
      create: {
        kind: dto.kind,
        tab: EXECUTOR_PROFILES_TAB,
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
        kind_tab: { kind, tab: SIGNATORY_PROFILES_TAB },
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
        kind_tab: { kind: dto.kind, tab: SIGNATORY_PROFILES_TAB },
      },
      create: {
        kind: dto.kind,
        tab: SIGNATORY_PROFILES_TAB,
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
}
