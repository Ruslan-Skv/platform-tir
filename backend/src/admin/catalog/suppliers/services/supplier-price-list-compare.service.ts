import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../database/prisma.service';
import { diffPriceListRows } from '../parsers/stroykom-price-list.parser';
import type {
  PriceListDiffRow,
  SupplierPriceListCategory,
} from '../parsers/price-list-parser.types';
import {
  ensureSupplier,
  formatCatalogItemLabel,
  mapSnapshotRowsToParsed,
  snapshotMeta,
  snapshotRowsOrder,
  uploadedBySelect,
} from '../supplier-price-list.shared';

@Injectable()
export class SupplierPriceListCompareService {
  constructor(private readonly prisma: PrismaService) {}

  async listSnapshots(supplierId: string, category?: SupplierPriceListCategory) {
    await ensureSupplier(this.prisma, supplierId);
    return this.prisma.supplierPriceListSnapshot.findMany({
      where: { supplierId, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        fileName: true,
        priceListDate: true,
        parserCode: true,
        sheetName: true,
        rowCount: true,
        createdAt: true,
        uploadedBy: { select: uploadedBySelect },
      },
    });
  }

  async getSnapshot(supplierId: string, snapshotId: string, category?: SupplierPriceListCategory) {
    const snapshot = await this.prisma.supplierPriceListSnapshot.findFirst({
      where: { id: snapshotId, supplierId },
      include: {
        uploadedBy: { select: uploadedBySelect },
        rows: { orderBy: snapshotRowsOrder },
      },
    });
    if (!snapshot) throw new NotFoundException('Снимок прайс-листа не найден');
    if (category && snapshot.category !== category) {
      throw new NotFoundException('Снимок прайс-листа не найден');
    }
    return snapshot;
  }

  async compareSnapshots(
    supplierId: string,
    currentSnapshotId: string,
    previousSnapshotId?: string,
    category?: SupplierPriceListCategory,
  ) {
    await ensureSupplier(this.prisma, supplierId);

    const currentSnapshot = await this.getSnapshot(supplierId, currentSnapshotId, category);
    let previousSnapshot = previousSnapshotId
      ? await this.getSnapshot(supplierId, previousSnapshotId, category)
      : null;

    if (!previousSnapshot) {
      previousSnapshot = await this.prisma.supplierPriceListSnapshot.findFirst({
        where: {
          supplierId,
          category: currentSnapshot.category,
          createdAt: { lt: currentSnapshot.createdAt },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: uploadedBySelect },
          rows: { orderBy: snapshotRowsOrder },
        },
      });
    }

    if (!previousSnapshot) {
      return {
        currentSnapshot: snapshotMeta(currentSnapshot),
        previousSnapshot: null,
        summary: {
          unchanged: 0,
          changed: 0,
          added: currentSnapshot.rows.length,
          removed: 0,
        },
        rows: currentSnapshot.rows.map((row) => ({
          status: 'added' as const,
          rowKey: row.rowKey,
          blockTitle: row.blockTitle,
          color: row.color,
          itemName: row.itemName,
          size: row.size,
          material: row.material,
          variantNote: row.variantNote,
          previousPrice: null,
          currentPrice: Number(row.priceRrc),
          delta: null,
          catalogItemId: null,
          catalogItemLabel: null,
        })),
      };
    }

    const diff = diffPriceListRows(
      mapSnapshotRowsToParsed(previousSnapshot.rows),
      mapSnapshotRowsToParsed(currentSnapshot.rows),
    );

    const mappings = await this.prisma.supplierPriceListRowMapping.findMany({
      where: { supplierId },
      include: {
        catalogItem: {
          select: { id: true, name: true, size: true, color: true, price: true },
        },
      },
    });
    const mappingByKey = new Map(mappings.map((m) => [m.rowKey, m]));

    const rows: PriceListDiffRow[] = diff.map((row) => {
      const mapping =
        currentSnapshot.category === 'TRIM' ? mappingByKey.get(row.rowKey) : undefined;
      return {
        ...row,
        catalogItemId: mapping?.catalogItemId ?? null,
        catalogItemLabel: mapping ? formatCatalogItemLabel(mapping.catalogItem) : null,
      };
    });

    const summary = {
      unchanged: rows.filter((r) => r.status === 'unchanged').length,
      changed: rows.filter((r) => r.status === 'changed').length,
      added: rows.filter((r) => r.status === 'added').length,
      removed: rows.filter((r) => r.status === 'removed').length,
    };

    return {
      currentSnapshot: snapshotMeta(currentSnapshot),
      previousSnapshot: snapshotMeta(previousSnapshot),
      summary,
      rows,
    };
  }
}
