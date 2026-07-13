import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../database/prisma.service';
import type { SupplierPriceListCategory } from '../parsers/price-list-parser.types';
import { findCatalogMatch, loadCatalogCandidates } from '../supplier-price-list-catalog-match';
import { ensureSupplier } from '../supplier-price-list.shared';
import { SupplierPriceListCompareService } from './supplier-price-list-compare.service';

@Injectable()
export class SupplierPriceListMappingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compareService: SupplierPriceListCompareService,
  ) {}

  async autoMapRows(
    supplierId: string,
    snapshotId?: string,
    category: SupplierPriceListCategory = 'TRIM',
  ) {
    if (category !== 'TRIM') {
      throw new BadRequestException('Автопривязка доступна только для погонажа');
    }
    await ensureSupplier(this.prisma, supplierId);
    const candidates = await loadCatalogCandidates(this.prisma, supplierId);

    let rowKeys: string[] | undefined;
    if (snapshotId) {
      const snapshot = await this.compareService.getSnapshot(supplierId, snapshotId);
      rowKeys = snapshot.rows.map((r) => r.rowKey);
    }

    const existingMappings = await this.prisma.supplierPriceListRowMapping.findMany({
      where: { supplierId, ...(rowKeys ? { rowKey: { in: rowKeys } } : {}) },
    });
    const mappedKeys = new Set(existingMappings.map((m) => m.rowKey));

    const rowsToMap = snapshotId
      ? (await this.compareService.getSnapshot(supplierId, snapshotId)).rows
      : await this.prisma.supplierPriceListRow.findMany({
          where: {
            snapshot: { supplierId },
            snapshotId: (
              await this.prisma.supplierPriceListSnapshot.findFirst({
                where: { supplierId },
                orderBy: { createdAt: 'desc' },
              })
            )?.id,
          },
        });

    let mapped = 0;
    let skipped = 0;

    for (const row of rowsToMap) {
      if (mappedKeys.has(row.rowKey)) {
        skipped += 1;
        continue;
      }

      const match = findCatalogMatch(
        {
          blockTitle: row.blockTitle,
          color: row.color,
          itemName: row.itemName,
          size: row.size,
          variantNote: row.variantNote,
          rowKey: row.rowKey,
        },
        candidates,
      );

      if (!match) {
        skipped += 1;
        continue;
      }

      await this.prisma.supplierPriceListRowMapping.upsert({
        where: { supplierId_rowKey: { supplierId, rowKey: row.rowKey } },
        create: {
          supplierId,
          rowKey: row.rowKey,
          catalogItemId: match.catalogItemId,
        },
        update: { catalogItemId: match.catalogItemId },
      });
      mapped += 1;
      mappedKeys.add(row.rowKey);
    }

    return { mapped, skipped, total: rowsToMap.length };
  }

  async listMappings(supplierId: string) {
    await ensureSupplier(this.prisma, supplierId);
    return this.prisma.supplierPriceListRowMapping.findMany({
      where: { supplierId },
      include: {
        catalogItem: {
          select: {
            id: true,
            name: true,
            size: true,
            color: true,
            price: true,
            kindRef: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { rowKey: 'asc' },
    });
  }

  async saveMapping(supplierId: string, rowKey: string, catalogItemId: string) {
    await ensureSupplier(this.prisma, supplierId);
    const item = await this.prisma.componentCatalogItem.findUnique({
      where: { id: catalogItemId },
    });
    if (!item) throw new NotFoundException('Позиция справочника не найдена');

    return this.prisma.supplierPriceListRowMapping.upsert({
      where: { supplierId_rowKey: { supplierId, rowKey } },
      create: { supplierId, rowKey, catalogItemId },
      update: { catalogItemId },
      include: {
        catalogItem: {
          select: { id: true, name: true, size: true, color: true, price: true },
        },
      },
    });
  }

  async applyPriceChanges(
    supplierId: string,
    currentSnapshotId: string,
    previousSnapshotId?: string,
    rowKeys?: string[],
    category?: SupplierPriceListCategory,
  ) {
    const comparison = await this.compareService.compareSnapshots(
      supplierId,
      currentSnapshotId,
      previousSnapshotId,
      category,
    );

    const currentSnapshot = await this.compareService.getSnapshot(
      supplierId,
      currentSnapshotId,
      category,
    );
    if (currentSnapshot.category !== 'TRIM') {
      throw new BadRequestException('Применение цен доступно только для погонажа');
    }

    const applicable = comparison.rows.filter(
      (row) =>
        row.status === 'changed' &&
        row.currentPrice !== null &&
        row.catalogItemId &&
        (!rowKeys?.length || rowKeys.includes(row.rowKey)),
    );

    if (applicable.length === 0) {
      return {
        updated: 0,
        items: [] as Array<{ catalogItemId: string; oldPrice: number; newPrice: number }>,
      };
    }

    const updates: Array<{ catalogItemId: string; oldPrice: number; newPrice: number }> = [];

    await this.prisma.$transaction(async (tx) => {
      for (const row of applicable) {
        const item = await tx.componentCatalogItem.findUnique({
          where: { id: row.catalogItemId! },
        });
        if (!item) continue;

        const oldPrice = Number(item.price);
        const newPrice = row.currentPrice!;
        if (oldPrice === newPrice) continue;

        await tx.componentCatalogItem.update({
          where: { id: row.catalogItemId! },
          data: { price: newPrice },
        });

        updates.push({
          catalogItemId: row.catalogItemId!,
          oldPrice,
          newPrice,
        });
      }
    });

    return { updated: updates.length, items: updates };
  }
}
