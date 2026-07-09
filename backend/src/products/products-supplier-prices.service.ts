import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { PriceScraperService } from './price-scraper.service';
import { ProductsSearchIndexService } from './products-search-index.service';
import {
  formatSupplierPriceError,
  type SupplierPriceErrorCode,
} from './utils/supplier-price-error.util';

export interface SyncSupplierPricesResult {
  total: number;
  updated: number;
  changed: number;
  errors: Array<{
    productId: string;
    productName: string;
    error: string;
    errorCode: SupplierPriceErrorCode;
  }>;
}

export interface UpdateSupplierPricesResult {
  total: number;
  updated: number;
  changed: number;
  changedIds: string[];
  errors: Array<{
    productId: string;
    productName: string;
    error: string;
    errorCode: SupplierPriceErrorCode;
  }>;
}

export interface ApplySupplierPricesResult {
  total: number;
  synced: number;
  syncedIds: string[];
  errors: Array<{
    productId: string;
    productName: string;
    error: string;
    errorCode: SupplierPriceErrorCode;
  }>;
}

@Injectable()
export class ProductsSupplierPricesService {
  constructor(
    private prisma: PrismaService,
    private priceScraper: PriceScraperService,
    private searchIndex: ProductsSearchIndexService,
  ) {}

  async syncSupplierPrices(): Promise<SyncSupplierPricesResult> {
    const rows = await this.prisma.productSupplier.findMany({
      where: {
        supplierProductUrl: { not: null },
      },
      include: {
        product: { select: { id: true, name: true, categoryId: true } },
      },
    });

    const result: SyncSupplierPricesResult = {
      total: rows.length,
      updated: 0,
      changed: 0,
      errors: [],
    };

    for (const row of rows) {
      const url = row.supplierProductUrl;
      if (!url) continue;

      try {
        const { price: newPrice } = await this.priceScraper.getPriceFromUrl(url, {
          supplierId: row.supplierId,
          categoryId: row.product.categoryId,
        });
        const currentPrice = Number(row.supplierPrice);
        const priceChanged = Math.abs(newPrice - currentPrice) > 0.01;

        await this.prisma.productSupplier.update({
          where: { id: row.id },
          data: {
            supplierPrice: new Prisma.Decimal(newPrice),
            lastSyncAt: new Date(),
            ...(priceChanged && { supplierPriceChangedAt: new Date() }),
          },
        });

        result.updated += 1;
        if (priceChanged) result.changed += 1;
      } catch (err) {
        const { message, errorCode } = formatSupplierPriceError(err);
        result.errors.push({
          productId: row.productId,
          productName: row.product.name,
          error: message,
          errorCode,
        });
      }
    }

    return result;
  }

  /**
   * Обновить цены поставщика по ссылкам для выбранных товаров.
   * Получает цену по URL, обновляет supplierPrice; при изменении ставит supplierPriceChangedAt.
   * Возвращает changedIds — id товаров, у которых цена изменилась.
   */
  async updateSupplierPrices(productIds: string[]): Promise<UpdateSupplierPricesResult> {
    const rows = await this.prisma.productSupplier.findMany({
      where: {
        productId: { in: productIds },
        isMainSupplier: true,
        supplierProductUrl: { not: null },
      },
      include: {
        product: { select: { id: true, name: true, categoryId: true } },
      },
    });

    const result: UpdateSupplierPricesResult = {
      total: rows.length,
      updated: 0,
      changed: 0,
      changedIds: [],
      errors: [],
    };

    for (const row of rows) {
      const url = row.supplierProductUrl;
      if (!url) continue;

      try {
        const { price: newPrice } = await this.priceScraper.getPriceFromUrl(url, {
          supplierId: row.supplierId,
          categoryId: row.product.categoryId,
        });
        const currentPrice = Number(row.supplierPrice);
        const priceChanged = Math.abs(newPrice - currentPrice) > 0.01;

        await this.prisma.productSupplier.update({
          where: { id: row.id },
          data: {
            supplierPrice: new Prisma.Decimal(newPrice),
            lastSyncAt: new Date(),
            ...(priceChanged && { supplierPriceChangedAt: new Date() }),
          },
        });

        result.updated += 1;
        if (priceChanged) {
          result.changed += 1;
          result.changedIds.push(row.productId);
        }
      } catch (err) {
        const { message, errorCode } = formatSupplierPriceError(err);
        result.errors.push({
          productId: row.productId,
          productName: row.product.name,
          error: message,
          errorCode,
        });
      }
    }

    return result;
  }

  /**
   * Синхронизация: установить цену товара равной цене поставщика для выбранных товаров.
   */
  async applySupplierPrices(productIds: string[]): Promise<ApplySupplierPricesResult> {
    const rows = await this.prisma.productSupplier.findMany({
      where: {
        productId: { in: productIds },
        isMainSupplier: true,
      },
      include: {
        product: { select: { id: true, name: true } },
      },
    });

    const result: ApplySupplierPricesResult = {
      total: rows.length,
      synced: 0,
      syncedIds: [],
      errors: [],
    };

    for (const row of rows) {
      try {
        const supplierPrice = Number(row.supplierPrice);
        await this.prisma.product.update({
          where: { id: row.productId },
          data: { price: new Prisma.Decimal(supplierPrice) },
        });
        result.synced += 1;
        result.syncedIds.push(row.productId);
      } catch (err) {
        const { message, errorCode } = formatSupplierPriceError(err);
        result.errors.push({
          productId: row.productId,
          productName: row.product.name,
          error: message,
          errorCode,
        });
      }
    }

    // Обновить индексы в Elasticsearch и сбросить supplierPriceChangedAt у синхронизированных
    const syncedIds = result.syncedIds;
    if (syncedIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: syncedIds } },
        include: { category: true },
      });
      for (const p of products) {
        await this.searchIndex.indexProduct(p);
      }
      await this.prisma.productSupplier.updateMany({
        where: { productId: { in: syncedIds }, isMainSupplier: true },
        data: { supplierPriceChangedAt: null },
      });
    }

    return result;
  }
}
