import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ContractDocumentPackageKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  ContractEstimateGroupDto,
  ContractEstimatePresetDto,
} from './dto/set-global-estimate-presets.dto';
import { ContractDocumentPackageEstimatePresetsService } from './contract-document-package-estimate-presets.service';

/** Формат файла переноса: `tir-estimate-presets-export`. */
export const ESTIMATE_TRANSFER_FORMAT = 'tir-estimate-presets-export';
export const ESTIMATE_TRANSFER_VERSION = 1;

export type EstimateTransferCatalogCategory = {
  id: string;
  name: string;
  slug: string;
  priceMarkupPercent: number;
  sortOrder: number;
  isActive: boolean;
  parentId?: string | null;
};

export type EstimateTransferCatalogItem = {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  unit: string;
  workGroup?: 'DEMOLITION' | 'ROUGH' | 'FINISHING' | null;
  sortOrder: number;
  isActive: boolean;
};

export type EstimateTransferPayload = {
  format: typeof ESTIMATE_TRANSFER_FORMAT;
  version: typeof ESTIMATE_TRANSFER_VERSION;
  exportedAt: string;
  kind: ContractDocumentPackageKind;
  presets: ContractEstimatePresetDto[];
  groups: ContractEstimateGroupDto[];
  catalog: {
    categories: EstimateTransferCatalogCategory[];
    items: EstimateTransferCatalogItem[];
  };
};

export type EstimateTransferImportReport = {
  ok: true;
  kind: ContractDocumentPackageKind;
  /** Созданные расчёты: новые id и исходные названия. */
  presets: Array<{ id: string; title: string }>;
  groupTitles: string[];
  catalogCategoriesCreated: number;
  catalogItemsCreated: number;
  catalogItemsUpdated: number;
  /** Расчёты из корзины источника, пропущенные при импорте. */
  skippedTrashed: number;
};

const PACKAGE_KINDS = new Set<string>(Object.values(ContractDocumentPackageKind));

/**
 * Перенос реального расчёта между базами (прод → локальная) для суперадмина:
 * экспорт расчёта со связкой, объектом и позициями каталога в JSON-файл
 * и импорт файла в текущую базу с сохранением ссылок на каталог.
 */
@Injectable()
export class ContractDocumentPackageEstimateTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presets: ContractDocumentPackageEstimatePresetsService,
  ) {}

  /** Id связки как в списке расчётов: собственный `splitBundleId` или якорь `preset.id`. */
  private resolveSplitBundleId(
    preset: ContractEstimatePresetDto,
    items: ContractEstimatePresetDto[],
  ): string | undefined {
    const own = preset.splitBundleId?.trim();
    if (own) return own;
    if (items.some((p) => p.id !== preset.id && p.splitBundleId === preset.id)) {
      return preset.id;
    }
    return undefined;
  }

  /**
   * Собирает `itemId` из снимков и черновиков (JSON со вложенными строками-черновиками
   * комплексных расчётов), чтобы выгрузить только те позиции каталога, на которые ссылается расчёт.
   */
  private collectCatalogItemIds(presets: ContractEstimatePresetDto[]): Set<string> {
    const ids = new Set<string>();
    const visit = (value: unknown, depth: number) => {
      if (depth > 8 || value == null) return;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return;
        try {
          visit(JSON.parse(trimmed), depth + 1);
        } catch {
          /* не JSON — пропускаем */
        }
        return;
      }
      if (Array.isArray(value)) {
        for (const v of value) visit(v, depth);
        return;
      }
      if (typeof value === 'object') {
        for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
          if (key === 'itemId' && typeof v === 'string' && v.trim()) {
            ids.add(v.trim());
          } else {
            visit(v, depth);
          }
        }
      }
    };
    for (const preset of presets) {
      visit(preset.snapshot, 0);
      visit(preset.calculatorDraft, 0);
    }
    return ids;
  }

  /** Категории позиций вместе с родительской цепочкой (родители идут раньше детей). */
  private async loadCategoriesChain(
    categoryIds: Set<string>,
  ): Promise<EstimateTransferCatalogCategory[]> {
    const byId = new Map<string, { id: string; parentId: string | null }>();
    let frontier = [...categoryIds];
    const seen = new Set<string>();
    while (frontier.length > 0) {
      const rows = await this.prisma.serviceCatalogCategory.findMany({
        where: { id: { in: frontier } },
        select: { id: true, parentId: true },
      });
      const next: string[] = [];
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        byId.set(row.id, row);
        if (row.parentId && !seen.has(row.parentId)) next.push(row.parentId);
      }
      frontier = next;
    }
    const ordered: string[] = [];
    const emitted = new Set<string>();
    for (const id of seen) {
      const chain: string[] = [];
      let cursor: string | null = id;
      while (cursor && !emitted.has(cursor) && byId.has(cursor)) {
        chain.unshift(cursor);
        cursor = byId.get(cursor)!.parentId;
      }
      for (const categoryId of chain) {
        if (emitted.has(categoryId)) continue;
        emitted.add(categoryId);
        ordered.push(categoryId);
      }
    }
    const full = await this.prisma.serviceCatalogCategory.findMany({
      where: { id: { in: ordered } },
    });
    const byFullId = new Map(full.map((c) => [c.id, c]));
    return ordered
      .map((id) => byFullId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        priceMarkupPercent: Number(c.priceMarkupPercent),
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        parentId: c.parentId,
      }));
  }

  /**
   * Экспорт расчёта: сам расчёт, его связка «Разделения сметы», остальные расчёты того же
   * объекта, объекты и позиции каталога, на которые ссылаются снимки/черновики.
   * Расчёты из корзины не выгружаются — их состав уже недоступен в списке.
   */
  async exportEstimatePreset(
    kind: ContractDocumentPackageKind,
    presetId: string,
  ): Promise<EstimateTransferPayload> {
    const raw = await this.presets.loadEstimatePresetsRaw(kind);
    // Корзина (deletedAt) в экспорт не попадает: в списке этих расчётов нет.
    const visibleItems = raw.items.filter((item) => !item.deletedAt?.trim());
    const target = visibleItems.find((item) => item.id === presetId);
    if (!target) {
      throw new NotFoundException('Расчёт не найден');
    }

    const bundleId = this.resolveSplitBundleId(target, visibleItems);
    const selectedIds = new Set<string>([target.id]);
    if (bundleId) {
      for (const item of visibleItems) {
        if (this.resolveSplitBundleId(item, visibleItems) === bundleId) {
          selectedIds.add(item.id);
        }
      }
    }
    if (target.groupId) {
      for (const item of visibleItems) {
        if (item.groupId === target.groupId) selectedIds.add(item.id);
      }
    }
    const presets = visibleItems.filter((item) => selectedIds.has(item.id));

    const groupIds = new Set(
      presets.map((item) => item.groupId).filter((id): id is string => Boolean(id?.trim())),
    );
    const groups = raw.groups.filter((g) => groupIds.has(g.id));

    const itemIds = this.collectCatalogItemIds(presets);
    const catalogItems = [...itemIds].length
      ? await this.prisma.serviceCatalogItem.findMany({
          where: { id: { in: [...itemIds] } },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        })
      : [];
    const categories = await this.loadCategoriesChain(
      new Set(catalogItems.map((item) => item.categoryId)),
    );

    return {
      format: ESTIMATE_TRANSFER_FORMAT,
      version: ESTIMATE_TRANSFER_VERSION,
      exportedAt: new Date().toISOString(),
      kind,
      presets,
      groups,
      catalog: {
        categories,
        items: catalogItems.map((item) => ({
          id: item.id,
          categoryId: item.categoryId,
          name: item.name,
          price: Number(item.price),
          unit: item.unit,
          workGroup: item.workGroup ?? null,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
        })),
      },
    };
  }

  private assertPresetShape(
    preset: unknown,
    index: number,
  ): asserts preset is ContractEstimatePresetDto {
    if (!preset || typeof preset !== 'object') {
      throw new BadRequestException(`Расчёт №${index + 1} в файле — не объект`);
    }
    const p = preset as Record<string, unknown>;
    for (const field of ['id', 'title', 'categorySlug', 'categoryName', 'calculatorDraft']) {
      if (typeof p[field] !== 'string' || !(p[field] as string).trim()) {
        throw new BadRequestException(`Расчёт №${index + 1} в файле без поля «${field}»`);
      }
    }
  }

  private assertGroupShape(
    group: unknown,
    index: number,
  ): asserts group is ContractEstimateGroupDto {
    if (!group || typeof group !== 'object') {
      throw new BadRequestException(`Объект №${index + 1} в файле — не объект`);
    }
    const g = group as Record<string, unknown>;
    for (const field of ['id', 'title']) {
      if (typeof g[field] !== 'string' || !(g[field] as string).trim()) {
        throw new BadRequestException(`Объект №${index + 1} в файле без поля «${field}»`);
      }
    }
  }

  /** Каталог: категории матчятся по slug, позиции — по id (цены приводим к значениям файла). */
  private async importCatalog(
    payload: EstimateTransferPayload,
  ): Promise<{ categoriesCreated: number; itemsCreated: number; itemsUpdated: number }> {
    const categoryIdMap = new Map<string, string>();
    let categoriesCreated = 0;
    for (const category of payload.catalog?.categories ?? []) {
      const existing = await this.prisma.serviceCatalogCategory.findUnique({
        where: { slug: category.slug },
        select: { id: true },
      });
      if (existing) {
        categoryIdMap.set(category.id, existing.id);
        continue;
      }
      const parentId = category.parentId ? (categoryIdMap.get(category.parentId) ?? null) : null;
      const idTaken = await this.prisma.serviceCatalogCategory.findUnique({
        where: { id: category.id },
        select: { id: true },
      });
      const created = await this.prisma.serviceCatalogCategory.create({
        data: {
          id: idTaken ? undefined : category.id,
          name: category.name,
          slug: category.slug,
          priceMarkupPercent: category.priceMarkupPercent ?? 0,
          sortOrder: category.sortOrder ?? 0,
          isActive: category.isActive ?? true,
          parentId,
        },
        select: { id: true },
      });
      categoryIdMap.set(category.id, created.id);
      categoriesCreated += 1;
    }

    let itemsCreated = 0;
    let itemsUpdated = 0;
    for (const item of payload.catalog?.items ?? []) {
      const localCategoryId = categoryIdMap.get(item.categoryId);
      if (!localCategoryId) {
        throw new BadRequestException(
          `В файле нет категории каталога для позиции «${item.name}» — импорт прерван`,
        );
      }
      const data = {
        categoryId: localCategoryId,
        name: item.name,
        price: item.price,
        unit: item.unit,
        workGroup: item.workGroup ?? null,
        sortOrder: item.sortOrder ?? 0,
        isActive: item.isActive ?? true,
      };
      const existing = await this.prisma.serviceCatalogItem.findUnique({
        where: { id: item.id },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.serviceCatalogItem.update({ where: { id: item.id }, data });
        itemsUpdated += 1;
      } else {
        await this.prisma.serviceCatalogItem.create({ data: { id: item.id, ...data } });
        itemsCreated += 1;
      }
    }
    return { categoriesCreated, itemsCreated, itemsUpdated };
  }

  /**
   * Импорт файла экспорта в текущую базу: каталог докатывается/обновляется,
   * расчёты и объекты создаются с новыми id (связки и ссылки на объект сохраняются),
   * копия попадает на вкладку «В работе». Расчёты из корзины пропускаются
   * (не «воскрешаются») — в файле они могли остаться от старых версий экспорта.
   */
  async importEstimatePreset(
    payload: EstimateTransferPayload,
    actorUserId?: string,
  ): Promise<EstimateTransferImportReport> {
    if (
      !payload ||
      payload.format !== ESTIMATE_TRANSFER_FORMAT ||
      payload.version !== ESTIMATE_TRANSFER_VERSION
    ) {
      throw new BadRequestException('Файл не похож на экспорт расчёта (формат/версия)');
    }
    const kind = payload.kind as ContractDocumentPackageKind;
    if (!PACKAGE_KINDS.has(kind)) {
      throw new BadRequestException('В файле неизвестное направление (kind)');
    }
    if (!Array.isArray(payload.presets) || payload.presets.length === 0) {
      throw new BadRequestException('В файле нет расчётов');
    }
    // Корзину не импортируем: удалённые в источнике расчёты не должны появляться активными здесь.
    const activePresets = payload.presets.filter((preset) => !preset.deletedAt?.trim());
    if (activePresets.length === 0) {
      throw new BadRequestException(
        'В файле нет активных расчётов (остальные в корзине источника)',
      );
    }
    const skippedTrashed = payload.presets.length - activePresets.length;
    activePresets.forEach((preset, index) => this.assertPresetShape(preset, index));
    const groups = (Array.isArray(payload.groups) ? payload.groups : []).filter(
      // объекты, на которые не ссылается ни один активный расчёт, не создаём
      (group) => activePresets.some((preset) => preset.groupId === group.id),
    );
    groups.forEach((group, index) => this.assertGroupShape(group, index));

    const catalogReport = await this.importCatalog(payload);

    const groupIdMap = new Map<string, string>();
    for (const group of groups) {
      groupIdMap.set(group.id, randomUUID());
    }
    const presetIdMap = new Map<string, string>();
    for (const preset of activePresets) {
      presetIdMap.set(preset.id, randomUUID());
    }

    const importedPresets: ContractEstimatePresetDto[] = activePresets.map((preset) => {
      const copy = { ...preset } as Record<string, unknown>;
      copy.id = presetIdMap.get(preset.id);
      if (typeof copy.groupId === 'string' && copy.groupId) {
        copy.groupId = groupIdMap.get(copy.groupId as string);
        if (!copy.groupId) delete copy.groupId;
      }
      if (typeof copy.splitBundleId === 'string' && copy.splitBundleId) {
        const mapped = presetIdMap.get(copy.splitBundleId as string);
        // Якорь связки мог уйти в корзину источника — связку собираем по оставшимся участникам.
        if (mapped) copy.splitBundleId = mapped;
        else delete copy.splitBundleId;
      }
      // Копия приходит в рабочий список: без корзины и вкладок; авторы и CRM прода к локальной базе не относятся.
      delete copy.deletedAt;
      delete copy.deletedById;
      delete copy.createdById;
      delete copy.createdByName;
      delete copy.crmCustomerId;
      delete copy.sourceMeasurementId;
      copy.pipelineStage = 'active';
      return copy as unknown as ContractEstimatePresetDto;
    });
    const importedGroups: ContractEstimateGroupDto[] = groups.map((group) => ({
      ...group,
      id: groupIdMap.get(group.id)!,
    }));

    const raw = await this.presets.loadEstimatePresetsRaw(kind);
    await this.presets.setGlobalEstimatePresets(
      {
        kind,
        items: [...raw.items, ...importedPresets],
        groups: [...raw.groups, ...importedGroups],
      },
      actorUserId,
    );

    return {
      ok: true,
      kind,
      presets: importedPresets.map((preset) => ({
        id: preset.id,
        title: preset.title,
      })),
      groupTitles: importedGroups.map((group) => group.title),
      catalogCategoriesCreated: catalogReport.categoriesCreated,
      catalogItemsCreated: catalogReport.itemsCreated,
      catalogItemsUpdated: catalogReport.itemsUpdated,
      skippedTrashed,
    };
  }
}
