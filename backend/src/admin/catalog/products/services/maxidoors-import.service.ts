import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../../../database/prisma.service';
import { getMaxidoorsCatalog, listMaxidoorsCatalogKeys } from './maxidoors-catalogs';
import {
  ensureMaxidoorsAttrSlots,
  findMissingMaxidoorsProducts,
  importMaxidoorsOneListing,
  resolveMaxidoorsCategory,
  resolveMaxidoorsSupplierId,
  syncMaxidoorsCatalogMissingFlags,
} from './maxidoors-import-support';
import {
  normalizeSupplierProductUrl,
  type MaxidoorsImportJob,
  type StartMaxidoorsImportOptions,
} from './maxidoors-import.types';
import { scrapeAllListings } from './maxidoors-scrape';

export type {
  MaxidoorsImportItemRef,
  MaxidoorsImportJob,
  MaxidoorsImportJobStatus,
  StartMaxidoorsImportOptions,
} from './maxidoors-import.types';

@Injectable()
export class MaxidoorsImportService {
  private readonly logger = new Logger(MaxidoorsImportService.name);
  private readonly jobs = new Map<string, MaxidoorsImportJob>();

  constructor(private readonly prisma: PrismaService) {}

  listCatalogs() {
    return listMaxidoorsCatalogKeys().map((key) => {
      const c = getMaxidoorsCatalog(key);
      return {
        key: c.key,
        label: c.label,
        categoryName: c.categoryName,
        defaultCategoryId: c.defaultCategoryId ?? null,
        listPath: c.listPath,
      };
    });
  }

  getJob(jobId: string): MaxidoorsImportJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException(`Import job ${jobId} not found`);
    return job;
  }

  startImport(opts: StartMaxidoorsImportOptions): { jobId: string } {
    const catalog = getMaxidoorsCatalog(opts.catalog);
    const jobId = randomUUID();
    const job: MaxidoorsImportJob = {
      id: jobId,
      catalog: catalog.key,
      status: 'pending',
      categoryId: opts.categoryId?.trim() || catalog.defaultCategoryId || '',
      supplierId: opts.supplierId?.trim() || null,
      total: 0,
      done: 0,
      created: 0,
      skipped: 0,
      errors: [],
      createdItems: [],
      missingItems: [],
      startedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    void this.runJob(jobId, catalog.key, {
      categoryId: opts.categoryId,
      limit: opts.limit,
      delayMs: opts.delayMs ?? 350,
      skipExisting: opts.skipExisting !== false,
      supplierId: opts.supplierId,
    }).catch((err) => {
      const j = this.jobs.get(jobId);
      if (!j) return;
      j.status = 'error';
      j.message = err instanceof Error ? err.message : String(err);
      j.finishedAt = new Date().toISOString();
      this.logger.error(`MaxiDoors ${catalog.key} import ${jobId} failed`, err);
    });

    return { jobId };
  }

  async importSync(opts: StartMaxidoorsImportOptions) {
    const { jobId } = this.startImport(opts);
    for (;;) {
      const job = this.getJob(jobId);
      if (job.status === 'done' || job.status === 'error') return job;
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  private async runJob(
    jobId: string,
    catalogKey: string,
    opts: {
      categoryId?: string;
      supplierId?: string;
      limit?: number;
      delayMs: number;
      skipExisting: boolean;
    },
  ) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const catalog = getMaxidoorsCatalog(catalogKey);
    job.status = 'running';

    const category = await resolveMaxidoorsCategory(this.prisma, catalog, opts.categoryId);
    job.categoryId = category.id;

    const supplierId = await resolveMaxidoorsSupplierId(this.prisma, opts.supplierId);
    job.supplierId = supplierId;
    if (!supplierId) {
      throw new BadRequestException(
        'Поставщик «Максидорс» не найден. Укажите supplierId или заведите поставщика с сайтом maxi-doors.ru',
      );
    }

    const attrSlots = await ensureMaxidoorsAttrSlots(this.prisma, category.id, catalog.attrRules);
    const categoryName = category.name;

    await this.prisma.productSupplier.updateMany({
      where: {
        supplierId,
        product: { categoryId: category.id },
        supplierCatalogNewAt: { not: null },
      },
      data: { supplierCatalogNewAt: null },
    });

    const allListings = await scrapeAllListings(catalog.listPath, opts.delayMs, (url, count) => {
      this.logger.log(`[${catalog.key}] Listing: ${url} → ${count}`);
    });
    const listingUrlSet = new Set(allListings.map((item) => normalizeSupplierProductUrl(item.url)));

    let listings = allListings;
    if (opts.limit && opts.limit > 0) {
      listings = allListings.slice(0, opts.limit);
    }
    job.total = listings.length;

    for (const listing of listings) {
      try {
        const result = await importMaxidoorsOneListing(this.prisma, listing, {
          catalog,
          categoryId: category.id,
          categoryName,
          supplierId,
          delayMs: opts.delayMs,
          skipExisting: opts.skipExisting,
          attrSlots,
        });
        if (result.status === 'created') {
          job.created += 1;
          if (result.item) job.createdItems.push(result.item);
        } else {
          job.skipped += 1;
        }
      } catch (e) {
        const msg = `${listing.productKey}: ${e instanceof Error ? e.message : String(e)}`;
        job.errors.push(msg);
        this.logger.warn(msg);
      } finally {
        job.done += 1;
      }
    }

    job.missingItems = await findMissingMaxidoorsProducts(this.prisma, {
      categoryId: category.id,
      supplierId,
      listingUrlSet,
    });

    await syncMaxidoorsCatalogMissingFlags(this.prisma, {
      categoryId: category.id,
      supplierId,
      missingProductIds: job.missingItems
        .map((item) => item.productId)
        .filter((id): id is string => Boolean(id)),
    });

    job.status = 'done';
    job.finishedAt = new Date().toISOString();
    job.message = `Создано ${job.created}, пропущено ${job.skipped}, отсутствует у поставщика ${job.missingItems.length}, ошибок ${job.errors.length}`;
  }
}
