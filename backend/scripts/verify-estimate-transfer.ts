/*
 * Разовая проверка экспорта/импорта расчёта (суперадмин): берёт реальный расчёт
 * из локальной базы, выгружает, импортирует копию, сверяет данные и откатывает изменения.
 * Запуск: npx ts-node --transpile-only scripts/verify-estimate-transfer.ts
 */
import { ContractDocumentPackageKind } from '@prisma/client';

import { PrismaService } from '../src/database/prisma.service';
import { ContractDocumentPackageEstimatePresetsService } from '../src/admin/contract-document-packages/contract-document-package-estimate-presets.service';
import {
  ContractDocumentPackageEstimateTransferService,
  type EstimateTransferPayload,
} from '../src/admin/contract-document-packages/contract-document-package-estimate-transfer.service';
import type {
  ContractEstimateGroupDto,
  ContractEstimatePresetDto,
} from '../src/admin/contract-document-packages/dto/set-global-estimate-presets.dto';

type SnapshotLine = { name?: string; amount?: number; price?: number };
type Snapshot = {
  total: number;
  rooms: Array<{ name: string; total: number; lines: SnapshotLine[] }>;
} | null;

function presetTotal(preset: ContractEstimatePresetDto): number {
  return (preset.snapshot as Snapshot)?.total ?? 0;
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function main() {
  const prisma = new PrismaService();
  const presets = new ContractDocumentPackageEstimatePresetsService(prisma);
  const transfer = new ContractDocumentPackageEstimateTransferService(prisma, presets);
  const kind = ContractDocumentPackageKind.REPAIR;

  const before = await presets.loadEstimatePresetsRaw(kind);
  if (before.items.length === 0) fail('в локальной базе нет расчётов — нечего проверять');
  // Берём самый «большой» расчёт (по итогу снимка) — как реальный тяжёлый случай.
  const target = [...before.items].sort((a, b) => presetTotal(b) - presetTotal(a))[0]!;
  console.log(
    `Цель: «${target.title}» (total=${presetTotal(target)}, group=${target.groupId ?? '—'}, bundle=${target.splitBundleId ?? '—'})`,
  );

  // Снимок состояния для отката.
  const catalogBefore = new Map<
    string,
    {
      id: string;
      categoryId: string;
      name: string;
      price: number;
      unit: string;
      workGroup: string | null;
      sortOrder: number;
      isActive: boolean;
    } | null
  >();

  // 1. Экспорт.
  const payload: EstimateTransferPayload = await transfer.exportEstimatePreset(kind, target.id);
  const payloadSizeKb = Math.round(JSON.stringify(payload).length / 102.4) / 10;
  console.log(
    `Экспорт: пресетов=${payload.presets.length}, объектов=${payload.groups.length}, категорий=${payload.catalog.categories.length}, позиций каталога=${payload.catalog.items.length}, размер=${payloadSizeKb} КБ`,
  );
  if (!payload.presets.some((p) => p.id === target.id)) fail('целевой расчёт не попал в экспорт');

  for (const item of payload.catalog.items) {
    catalogBefore.set(item.id, null); // null = позиции не было (будет создана)
  }
  const existingCatalog = await prisma.serviceCatalogItem.findMany({
    where: { id: { in: [...catalogBefore.keys()] } },
  });
  for (const row of existingCatalog) {
    catalogBefore.set(row.id, {
      id: row.id,
      categoryId: row.categoryId,
      name: row.name,
      price: Number(row.price),
      unit: row.unit,
      workGroup: row.workGroup ?? null,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    });
  }
  const categoriesBefore = new Set(
    (await prisma.serviceCatalogCategory.findMany({ select: { id: true } })).map((c) => c.id),
  );

  // 2. Импорт.
  const report = await transfer.importEstimatePreset(payload, undefined);
  console.log(
    `Импорт: расчётов=${report.presets.length}, объекты=[${report.groupTitles.join('; ')}], категории создано=${report.catalogCategoriesCreated}, позиции каталога: создано=${report.catalogItemsCreated}, обновлено=${report.catalogItemsUpdated}`,
  );

  // 3. Сверка.
  const after = await presets.loadEstimatePresetsRaw(kind);
  if (after.items.length !== before.items.length + payload.presets.length) {
    fail(
      `ожидалось расчётов ${before.items.length + payload.presets.length}, стало ${after.items.length}`,
    );
  }
  const oldById = new Map(payload.presets.map((p) => [p.id, p]));
  const newPresets = after.items.filter((p) => report.presets.some((r) => r.id === p.id));
  if (newPresets.length !== report.presets.length) fail('не все созданные расчёты нашлись в блобе');

  const oldIdByNewId = new Map<string, string>();
  payload.presets.forEach((p, idx) => oldIdByNewId.set(report.presets[idx]!.id, p.id));

  for (const created of newPresets) {
    const oldId = oldIdByNewId.get(created.id)!;
    const original = oldById.get(oldId)!;
    if (
      created.snapshot &&
      JSON.stringify(created.snapshot) !== JSON.stringify(original.snapshot)
    ) {
      fail(`снимок расчёта «${created.title}» изменился при импорте`);
    }
    if (created.calculatorDraft !== original.calculatorDraft) {
      fail(`черновик расчёта «${created.title}» изменился при импорте`);
    }
    if (
      JSON.stringify(created.estimateWorkScopeKeys ?? []) !==
      JSON.stringify(original.estimateWorkScopeKeys ?? [])
    ) {
      fail(`ключи «Разделения сметы» расчёта «${created.title}» изменились при импорте`);
    }
    if (created.additionalMarkupPercent !== original.additionalMarkupPercent) {
      fail(`наценка расчёта «${created.title}» изменилась при импорте`);
    }
    if (created.groupId && !after.groups.some((g) => g.id === created.groupId)) {
      fail(`у расчёта «${created.title}» нет объекта после импорта`);
    }
    if (oldId === target.id && created.id === oldId) fail('id целевого расчёта не сменился');
  }
  // Связка осталась связкой: у всех участников одинаковый splitBundleId.
  const bundleNewIds = newPresets.filter((p) => p.splitBundleId);
  const bundleIds = new Set(bundleNewIds.map((p) => p.splitBundleId));
  if (bundleNewIds.length > 1 && bundleIds.size !== 1) fail('связка развалилась при импорте');

  // Позиции каталога на месте с ценами из файла.
  const exportedItems = await prisma.serviceCatalogItem.findMany({
    where: { id: { in: payload.catalog.items.map((i) => i.id) } },
  });
  if (exportedItems.length !== payload.catalog.items.length) {
    fail(`позиций каталога в базе ${exportedItems.length} из ${payload.catalog.items.length}`);
  }
  for (const item of payload.catalog.items) {
    const row = exportedItems.find((r) => r.id === item.id)!;
    if (Number(row.price) !== item.price)
      fail(`цена позиции «${item.name}» не совпала: ${Number(row.price)} ≠ ${item.price}`);
  }
  console.log('Сверка: снимки, черновики, ключи доли, связка, объект и цены каталога совпадают.');

  // 4. Откат (база возвращается к исходному состоянию).
  await presets.setGlobalEstimatePresets(
    { kind, items: before.items, groups: before.groups } as never,
    undefined,
  );
  const createdItemIds = [...catalogBefore.entries()]
    .filter(([, v]) => v === null)
    .map(([id]) => id);
  if (createdItemIds.length > 0) {
    await prisma.serviceCatalogItem.deleteMany({ where: { id: { in: createdItemIds } } });
  }
  for (const [id, original] of catalogBefore.entries()) {
    if (original) {
      await prisma.serviceCatalogItem.update({
        where: { id },
        data: {
          categoryId: original.categoryId,
          name: original.name,
          price: original.price,
          unit: original.unit,
          workGroup: original.workGroup as never,
          sortOrder: original.sortOrder,
          isActive: original.isActive,
        },
      });
    }
  }
  const createdCategories = (
    await prisma.serviceCatalogCategory.findMany({ select: { id: true } })
  ).filter((c) => !categoriesBefore.has(c.id));
  if (createdCategories.length > 0) {
    // Детей удаляем первыми (parentId Restrict).
    for (const cat of createdCategories) {
      await prisma.serviceCatalogCategory.delete({ where: { id: cat.id } }).catch(() => undefined);
    }
  }
  const restored = await presets.loadEstimatePresetsRaw(kind);
  if (restored.items.length !== before.items.length)
    fail('откат не вернул исходное число расчётов');
  console.log(
    `Откат: расчётов снова ${restored.items.length}, созданных позиций каталога удалено ${createdItemIds.length}, созданных категорий удалено ${createdCategories.length}.`,
  );
  console.log('✓ Проверка экспорта/импорта расчёта прошла.');
  await prisma.$disconnect();
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
