import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ContractDocumentPackageKind, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  ContractEstimateGroupDto,
  ContractEstimatePresetDto,
  SetGlobalEstimatePresetsDto,
} from './dto/set-global-estimate-presets.dto';

const ESTIMATE_PRESETS_TAB = 'estimate_presets';
const ESTIMATE_PRESET_TRASH_RETENTION_DAYS = 30;
const ESTIMATE_PRESET_TRASH_RETENTION_MS =
  ESTIMATE_PRESET_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

@Injectable()
export class ContractDocumentPackageEstimatePresetsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Для валидации прикрепления расчётов к пакету ремонта. */
  async loadGlobalEstimatePresetsBlob(kind: ContractDocumentPackageKind) {
    return this.loadGlobalEstimatePresetsBlobInternal(kind);
  }

  async assertPipelineActive(presetIds: string[]): Promise<void> {
    const raw = await this.loadGlobalEstimatePresetsBlobInternal(
      ContractDocumentPackageKind.REPAIR,
    );
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

  private isEstimatePresetTrashed(item: ContractEstimatePresetDto): boolean {
    return Boolean(item.deletedAt?.trim());
  }

  private isEstimatePresetTrashExpired(deletedAt: string | undefined): boolean {
    const trimmed = deletedAt?.trim();
    if (!trimmed) return false;
    const deletedMs = Date.parse(trimmed);
    if (!Number.isFinite(deletedMs)) return false;
    return deletedMs < Date.now() - ESTIMATE_PRESET_TRASH_RETENTION_MS;
  }

  /** Безвозвратно удаляет расчёты из корзины, лежащие дольше срока хранения. */
  private async purgeExpiredTrashedEstimatePresets(
    kind: ContractDocumentPackageKind,
  ): Promise<number> {
    const raw = await this.loadGlobalEstimatePresetsBlobInternal(kind);
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
        kind_tab: { kind, tab: ESTIMATE_PRESETS_TAB },
      },
      create: {
        kind,
        tab: ESTIMATE_PRESETS_TAB,
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

  private async loadGlobalEstimatePresetsBlobInternal(kind: ContractDocumentPackageKind): Promise<{
    items: ContractEstimatePresetDto[];
    groups: ContractEstimateGroupDto[];
    updatedAt: string | null;
  }> {
    const row = await this.prisma.contractDocumentGlobalTemplate.findUnique({
      where: {
        kind_tab: { kind, tab: ESTIMATE_PRESETS_TAB },
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
    const raw = await this.loadGlobalEstimatePresetsBlobInternal(kind);
    return {
      items: raw.items.filter((item) => !this.isEstimatePresetTrashed(item)),
      groups: raw.groups,
      updatedAt: raw.updatedAt,
    };
  }

  async findEstimatePresetsTrash(
    kind: ContractDocumentPackageKind,
    params?: { search?: string; page?: number; limit?: number; createdById?: string },
  ) {
    await this.purgeExpiredTrashedEstimatePresets(kind);
    const raw = await this.loadGlobalEstimatePresetsBlobInternal(kind);
    const page = params?.page ?? 1;
    const limit = Math.min(Math.max(params?.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const searchNorm = params?.search?.trim().toLowerCase() ?? '';
    const createdById = params?.createdById?.trim() ?? '';

    let trashed = raw.items.filter((item) => this.isEstimatePresetTrashed(item));
    if (createdById) {
      trashed = trashed.filter((item) => (item.createdById?.trim() ?? '') === createdById);
    }
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
          ? new Date(deletedMs + ESTIMATE_PRESET_TRASH_RETENTION_MS).toISOString()
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
      trashRetentionDays: ESTIMATE_PRESET_TRASH_RETENTION_DAYS,
    };
  }

  async trashEstimatePreset(
    kind: ContractDocumentPackageKind,
    presetId: string,
    actorUserId?: string,
  ) {
    await this.purgeExpiredTrashedEstimatePresets(kind);
    const raw = await this.loadGlobalEstimatePresetsBlobInternal(kind);
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
    const raw = await this.loadGlobalEstimatePresetsBlobInternal(kind);
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
    const previousRaw = await this.loadGlobalEstimatePresetsBlobInternal(dto.kind);
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
        kind_tab: { kind: dto.kind, tab: ESTIMATE_PRESETS_TAB },
      },
      create: {
        kind: dto.kind,
        tab: ESTIMATE_PRESETS_TAB,
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
