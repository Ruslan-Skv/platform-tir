import { NotFoundException } from '@nestjs/common';
import * as path from 'path';

import type { PrismaService } from '../../../database/prisma.service';
import type {
  ParsedPriceListRow,
  SupplierPriceListCategory,
} from './parsers/price-list-parser.types';

export const SUPPLIER_PRICE_LIST_UPLOADS_DIR = path.join(
  process.cwd(),
  'uploads',
  'supplier-price-lists',
);

export function mapParsedRowsToCreate(rows: ParsedPriceListRow[]) {
  return rows.map((row) => ({
    rowKey: row.rowKey,
    blockTitle: row.blockTitle,
    color: row.color,
    itemName: row.itemName,
    size: row.size,
    material: row.material,
    variantNote: row.variantNote,
    priceRrc: row.priceRrc,
  }));
}

export function snapshotMeta(snapshot: {
  id: string;
  category?: SupplierPriceListCategory;
  fileName: string;
  priceListDate: string | null;
  rowCount: number;
  createdAt: Date;
}) {
  return {
    id: snapshot.id,
    category: snapshot.category ?? 'TRIM',
    fileName: snapshot.fileName,
    priceListDate: snapshot.priceListDate,
    rowCount: snapshot.rowCount,
    createdAt: snapshot.createdAt,
  };
}

export function formatCatalogItemLabel(item: {
  name: string;
  size: string | null;
  color: string | null;
}) {
  return [item.name, item.size, item.color].filter(Boolean).join(' · ');
}

export function mapSnapshotRowsToParsed(
  rows: Array<{
    rowKey: string;
    blockTitle: string;
    color: string;
    itemName: string;
    size: string | null;
    material: string | null;
    variantNote: string | null;
    priceRrc: { toString(): string } | number;
  }>,
): ParsedPriceListRow[] {
  return rows.map((row) => ({
    rowKey: row.rowKey,
    blockTitle: row.blockTitle,
    color: row.color,
    itemName: row.itemName,
    size: row.size,
    material: row.material,
    variantNote: row.variantNote,
    priceRrc: Number(row.priceRrc),
  }));
}

export async function ensureSupplier(prisma: PrismaService, supplierId: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new NotFoundException('Поставщик не найден');
  return supplier;
}

export const uploadedBySelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

export const snapshotRowsOrder = [
  { blockTitle: 'asc' as const },
  { color: 'asc' as const },
  { itemName: 'asc' as const },
];
