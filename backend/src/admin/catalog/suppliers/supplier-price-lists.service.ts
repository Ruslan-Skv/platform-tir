import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../../database/prisma.service';
import {
  diffPriceListRows,
  normalizePriceListText,
  parseStroykomPriceList,
  parseStroykomPriceListAll,
} from './parsers/stroykom-price-list.parser';
import type { ParsedPriceList } from './parsers/price-list-parser.types';
import type {
  ParsedPriceListRow,
  PriceListDiffRow,
  SupplierPriceListCategory,
} from './parsers/price-list-parser.types';
import { PRICE_LIST_CATEGORY_LABELS } from './parsers/price-list-parser.types';

const uploadsDir = path.join(process.cwd(), 'uploads', 'supplier-price-lists');

type CatalogCandidate = {
  catalogItemId: string;
  label: string;
  seriesName: string;
  subgroupName: string;
  kindCode: string;
  size: string | null;
  color: string | null;
  price: number;
};

@Injectable()
export class SupplierPriceListsService {
  constructor(private prisma: PrismaService) {}

  ensureUploadDir(supplierId: string) {
    const dir = path.join(uploadsDir, supplierId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async uploadSnapshot(
    supplierId: string,
    file: Express.Multer.File,
    category: SupplierPriceListCategory = 'TRIM',
    uploadedById?: string,
  ) {
    const { storedPath, storedFileName } = await this.saveUploadedFile(supplierId, file);

    let parsed: ParsedPriceList;
    try {
      parsed = parseStroykomPriceList(storedPath, category);
    } catch (e) {
      fs.unlinkSync(storedPath);
      throw new BadRequestException(e instanceof Error ? e.message : 'Ошибка разбора прайс-листа');
    }

    if (parsed.rows.length === 0) {
      fs.unlinkSync(storedPath);
      throw new BadRequestException(
        `В прайс-листе не найдено строк для категории «${PRICE_LIST_CATEGORY_LABELS[category]}»`,
      );
    }

    return this.createSnapshot(supplierId, file.originalname, storedFileName, parsed, uploadedById);
  }

  async uploadAllSnapshots(supplierId: string, file: Express.Multer.File, uploadedById?: string) {
    const { storedPath, storedFileName } = await this.saveUploadedFile(supplierId, file);

    let parsedCategories;
    try {
      parsedCategories = parseStroykomPriceListAll(storedPath);
    } catch (e) {
      fs.unlinkSync(storedPath);
      throw new BadRequestException(e instanceof Error ? e.message : 'Ошибка разбора прайс-листа');
    }

    const toCreate = parsedCategories.filter((item) => !item.skipped && item.parsed);
    if (toCreate.length === 0) {
      fs.unlinkSync(storedPath);
      throw new BadRequestException('В прайс-листе не найдено данных ни для одной категории');
    }

    const snapshots = await this.prisma.$transaction(
      toCreate.map((item) =>
        this.prisma.supplierPriceListSnapshot.create({
          data: {
            supplierId,
            category: item.category,
            fileName: file.originalname,
            storedFileName,
            priceListDate: item.parsed!.priceListDate,
            parserCode: item.parsed!.parserCode,
            sheetName: item.parsed!.sheetName,
            rowCount: item.parsed!.rows.length,
            uploadedById,
            rows: {
              create: item.parsed!.rows.map((row) => ({
                rowKey: row.rowKey,
                blockTitle: row.blockTitle,
                color: row.color,
                itemName: row.itemName,
                size: row.size,
                material: row.material,
                variantNote: row.variantNote,
                priceRrc: row.priceRrc,
              })),
            },
          },
          include: {
            uploadedBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        }),
      ),
    );

    return {
      fileName: file.originalname,
      snapshots,
      skipped: parsedCategories
        .filter((item) => item.skipped)
        .map((item) => ({
          category: item.category,
          reason:
            item.skipReason ?? `Категория «${PRICE_LIST_CATEGORY_LABELS[item.category]}» пропущена`,
        })),
    };
  }

  private async saveUploadedFile(supplierId: string, file: Express.Multer.File) {
    await this.ensureSupplier(supplierId);
    if (!file) throw new BadRequestException('Файл не загружен');

    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xls', '.xlsx'].includes(ext)) {
      throw new BadRequestException('Поддерживаются только файлы .xls и .xlsx');
    }

    const dir = this.ensureUploadDir(supplierId);
    const storedFileName = `${Date.now()}-${file.originalname.replace(/[^\w.\- ()а-яА-ЯёЁ]/g, '_')}`;
    const storedPath = path.join(dir, storedFileName);

    if (file.path && fs.existsSync(file.path)) {
      fs.renameSync(file.path, storedPath);
    } else if (file.buffer) {
      fs.writeFileSync(storedPath, file.buffer);
    } else {
      throw new BadRequestException('Не удалось сохранить файл');
    }

    return { storedPath, storedFileName };
  }

  private createSnapshot(
    supplierId: string,
    fileName: string,
    storedFileName: string,
    parsed: ParsedPriceList,
    uploadedById?: string,
  ) {
    return this.prisma.supplierPriceListSnapshot.create({
      data: {
        supplierId,
        category: parsed.category,
        fileName,
        storedFileName,
        priceListDate: parsed.priceListDate,
        parserCode: parsed.parserCode,
        sheetName: parsed.sheetName,
        rowCount: parsed.rows.length,
        uploadedById,
        rows: {
          create: parsed.rows.map((row) => ({
            rowKey: row.rowKey,
            blockTitle: row.blockTitle,
            color: row.color,
            itemName: row.itemName,
            size: row.size,
            material: row.material,
            variantNote: row.variantNote,
            priceRrc: row.priceRrc,
          })),
        },
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async listSnapshots(supplierId: string, category?: SupplierPriceListCategory) {
    await this.ensureSupplier(supplierId);
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
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async getSnapshot(supplierId: string, snapshotId: string, category?: SupplierPriceListCategory) {
    const snapshot = await this.prisma.supplierPriceListSnapshot.findFirst({
      where: { id: snapshotId, supplierId, ...(category ? { category } : {}) },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        rows: { orderBy: [{ blockTitle: 'asc' }, { color: 'asc' }, { itemName: 'asc' }] },
      },
    });
    if (!snapshot) throw new NotFoundException('Снимок прайс-листа не найден');
    return snapshot;
  }

  async compareSnapshots(
    supplierId: string,
    currentSnapshotId: string,
    previousSnapshotId?: string,
    category?: SupplierPriceListCategory,
  ) {
    await this.ensureSupplier(supplierId);

    const currentSnapshot = await this.getSnapshot(supplierId, currentSnapshotId, category);
    let previousSnapshot = previousSnapshotId
      ? await this.getSnapshot(supplierId, previousSnapshotId, category)
      : null;

    if (!previousSnapshot) {
      const previous = await this.prisma.supplierPriceListSnapshot.findFirst({
        where: {
          supplierId,
          category: currentSnapshot.category,
          createdAt: { lt: currentSnapshot.createdAt },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          rows: { orderBy: [{ blockTitle: 'asc' }, { color: 'asc' }, { itemName: 'asc' }] },
        },
      });
      previousSnapshot = previous;
    }

    if (!previousSnapshot) {
      return {
        currentSnapshot: this.snapshotMeta(currentSnapshot),
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

    const previousRows: ParsedPriceListRow[] = previousSnapshot.rows.map((r) => ({
      rowKey: r.rowKey,
      blockTitle: r.blockTitle,
      color: r.color,
      itemName: r.itemName,
      size: r.size,
      material: r.material,
      variantNote: r.variantNote,
      priceRrc: Number(r.priceRrc),
    }));

    const currentRows: ParsedPriceListRow[] = currentSnapshot.rows.map((r) => ({
      rowKey: r.rowKey,
      blockTitle: r.blockTitle,
      color: r.color,
      itemName: r.itemName,
      size: r.size,
      material: r.material,
      variantNote: r.variantNote,
      priceRrc: Number(r.priceRrc),
    }));

    const diff = diffPriceListRows(previousRows, currentRows);
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
        catalogItemLabel: mapping ? this.formatCatalogItemLabel(mapping.catalogItem) : null,
      };
    });

    const summary = {
      unchanged: rows.filter((r) => r.status === 'unchanged').length,
      changed: rows.filter((r) => r.status === 'changed').length,
      added: rows.filter((r) => r.status === 'added').length,
      removed: rows.filter((r) => r.status === 'removed').length,
    };

    return {
      currentSnapshot: this.snapshotMeta(currentSnapshot),
      previousSnapshot: this.snapshotMeta(previousSnapshot),
      summary,
      rows,
    };
  }

  async autoMapRows(
    supplierId: string,
    snapshotId?: string,
    category: SupplierPriceListCategory = 'TRIM',
  ) {
    if (category !== 'TRIM') {
      throw new BadRequestException('Автопривязка доступна только для погонажа');
    }
    await this.ensureSupplier(supplierId);
    const candidates = await this.loadCatalogCandidates(supplierId);

    let rowKeys: string[] | undefined;
    if (snapshotId) {
      const snapshot = await this.getSnapshot(supplierId, snapshotId);
      rowKeys = snapshot.rows.map((r) => r.rowKey);
    }

    const existingMappings = await this.prisma.supplierPriceListRowMapping.findMany({
      where: { supplierId, ...(rowKeys ? { rowKey: { in: rowKeys } } : {}) },
    });
    const mappedKeys = new Set(existingMappings.map((m) => m.rowKey));

    const rowsToMap = snapshotId
      ? (await this.getSnapshot(supplierId, snapshotId)).rows
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

      const match = this.findCatalogMatch(
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
    await this.ensureSupplier(supplierId);
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
    await this.ensureSupplier(supplierId);
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
    const comparison = await this.compareSnapshots(
      supplierId,
      currentSnapshotId,
      previousSnapshotId,
      category,
    );

    const currentSnapshot = await this.getSnapshot(supplierId, currentSnapshotId, category);
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

  private async ensureSupplier(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Поставщик не найден');
    return supplier;
  }

  private snapshotMeta(snapshot: {
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

  private formatCatalogItemLabel(item: {
    name: string;
    size: string | null;
    color: string | null;
  }) {
    return [item.name, item.size, item.color].filter(Boolean).join(' · ');
  }

  private async loadCatalogCandidates(supplierId: string): Promise<CatalogCandidate[]> {
    const series = await this.prisma.componentCatalogSeries.findMany({
      where: { supplierId },
      include: {
        subgroups: {
          include: {
            items: {
              include: {
                catalogItem: {
                  include: { kindRef: { select: { code: true, name: true } } },
                },
              },
            },
          },
        },
      },
    });

    const candidates: CatalogCandidate[] = [];
    for (const s of series) {
      for (const subgroup of s.subgroups) {
        for (const gi of subgroup.items) {
          const item = gi.catalogItem;
          candidates.push({
            catalogItemId: item.id,
            label: this.formatCatalogItemLabel(item),
            seriesName: s.name,
            subgroupName: subgroup.name,
            kindCode: item.kindRef.code,
            size: item.size,
            color: item.color ?? subgroup.name,
            price: Number(item.price),
          });
        }
      }
    }
    return candidates;
  }

  private findCatalogMatch(
    row: {
      blockTitle: string;
      color: string;
      itemName: string;
      size: string | null;
      variantNote: string | null;
      rowKey: string;
    },
    candidates: CatalogCandidate[],
  ): CatalogCandidate | null {
    const kindCode = this.detectKindCode(row.itemName);
    if (!kindCode) return null;

    const normalizedColor = normalizePriceListText(row.color);
    const normalizedSize = this.normalizeSize(row.size);
    const normalizedBlock = normalizePriceListText(row.blockTitle);
    const normalizedVariant = normalizePriceListText(row.variantNote ?? '');

    const scored = candidates
      .map((candidate) => {
        if (candidate.kindCode !== kindCode) return null;
        if (!this.sizeMatches(normalizedSize, candidate.size)) return null;

        const subgroupNorm = normalizePriceListText(candidate.subgroupName);
        const itemColorNorm = normalizePriceListText(candidate.color ?? '');
        const colorMatch =
          subgroupNorm.includes(normalizedColor) ||
          normalizedColor.includes(subgroupNorm) ||
          itemColorNorm.includes(normalizedColor) ||
          normalizedColor.includes(itemColorNorm);
        if (!colorMatch) return null;

        let score = 10;
        const seriesNorm = normalizePriceListText(candidate.seriesName);
        if (seriesNorm && normalizedBlock) {
          const blockTokens = normalizedBlock.split(' ').filter((t) => t.length > 3);
          const matchedTokens = blockTokens.filter(
            (t) => seriesNorm.includes(t) || normalizedBlock.includes(seriesNorm),
          );
          score += matchedTokens.length * 2;
        }

        if (normalizedVariant) {
          const subgroupHasVariant =
            subgroupNorm.includes(normalizedVariant) ||
            normalizePriceListText(candidate.subgroupName).includes('телескоп') ===
              normalizedVariant.includes('телескоп');
          if (subgroupHasVariant) score += 5;
        }

        return { candidate, score };
      })
      .filter((x): x is { candidate: CatalogCandidate; score: number } => x !== null)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;
    if (scored.length > 1 && scored[0].score === scored[1].score) return null;
    return scored[0].candidate;
  }

  private detectKindCode(itemName: string): string | null {
    const n = normalizePriceListText(itemName);
    if (n.includes('стойка')) return 'STOIKA_KOROBKI';
    if (n.includes('наличник')) return 'NALICHNIK';
    if (n.includes('добор')) return 'DOBOR';
    if (n.includes('притвор')) return 'PRITVORNAYA_PLANKA';
    return null;
  }

  private normalizeSize(size: string | null): string {
    if (!size) return '';
    const nums = size.match(/\d+/g);
    return nums ? nums.join('x') : normalizePriceListText(size);
  }

  private sizeMatches(priceListSize: string, catalogSize: string | null): boolean {
    const a = this.normalizeSize(priceListSize);
    const b = this.normalizeSize(catalogSize);
    if (!a || !b) return true;
    return a === b || a.includes(b) || b.includes(a);
  }
}
