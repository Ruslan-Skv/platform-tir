import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '../../../../database/prisma.service';
import type {
  ParsedPriceList,
  SupplierPriceListCategory,
} from '../parsers/price-list-parser.types';
import { PRICE_LIST_CATEGORY_LABELS } from '../parsers/price-list-parser.types';
import {
  parseStroykomPriceList,
  parseStroykomPriceListAll,
} from '../parsers/stroykom-price-list.parser';
import {
  SUPPLIER_PRICE_LIST_UPLOADS_DIR,
  ensureSupplier,
  mapParsedRowsToCreate,
  moveUploadedFile,
  uploadedBySelect,
} from '../supplier-price-list.shared';

@Injectable()
export class SupplierPriceListUploadService {
  constructor(private readonly prisma: PrismaService) {}

  ensureUploadDir(supplierId: string) {
    const dir = path.join(SUPPLIER_PRICE_LIST_UPLOADS_DIR, supplierId);
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
      async (tx) => {
        const created = [];
        for (const item of toCreate) {
          created.push(
            await tx.supplierPriceListSnapshot.create({
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
                rows: { create: mapParsedRowsToCreate(item.parsed!.rows) },
              },
              include: { uploadedBy: { select: uploadedBySelect } },
            }),
          );
        }
        return created;
      },
      { timeout: 120000, maxWait: 15000 },
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
    await ensureSupplier(this.prisma, supplierId);
    if (!file) throw new BadRequestException('Файл не загружен');

    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xls', '.xlsx'].includes(ext)) {
      throw new BadRequestException('Поддерживаются только файлы .xls и .xlsx');
    }

    const dir = this.ensureUploadDir(supplierId);
    const storedFileName = `${Date.now()}-${file.originalname.replace(/[^\w.\- ()а-яА-ЯёЁ]/g, '_')}`;
    const storedPath = path.join(dir, storedFileName);

    if (file.path && fs.existsSync(file.path)) {
      moveUploadedFile(file.path, storedPath);
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
        rows: { create: mapParsedRowsToCreate(parsed.rows) },
      },
      include: { uploadedBy: { select: uploadedBySelect } },
    });
  }
}
