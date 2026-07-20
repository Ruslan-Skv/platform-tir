import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../../../database/prisma.service';
import {
  getMaxidoorsCatalog,
  listMaxidoorsCatalogKeys,
  maxidoorsCatalogCategoryNames,
  type MaxidoorsAttrRule,
  type MaxidoorsCatalogConfig,
  type MaxidoorsCatalogKey,
} from './maxidoors-catalogs';
import {
  buildMaxidoorsProductDescription,
  buildSeoFields,
  downloadMaxidoorsImagesToUploads,
  extractColorFromName,
  fetchDetail,
  findCharValue,
  mergeProductImages,
  normalizeSlug,
  scrapeAllListings,
  slugify,
  type MaxidoorsListingItem,
} from './maxidoors-scrape';

export type MaxidoorsImportJobStatus = 'pending' | 'running' | 'done' | 'error';

export type MaxidoorsImportItemRef = {
  name: string;
  url: string;
  productId?: string;
  supplierSku?: string | null;
};

export type MaxidoorsImportJob = {
  id: string;
  catalog: MaxidoorsCatalogKey;
  status: MaxidoorsImportJobStatus;
  categoryId: string;
  supplierId: string | null;
  total: number;
  done: number;
  created: number;
  skipped: number;
  errors: string[];
  /** Новые товары, созданные в этом запуске */
  createdItems: MaxidoorsImportItemRef[];
  /** Ранее импортированные, которых больше нет в листинге поставщика */
  missingItems: MaxidoorsImportItemRef[];
  startedAt: string;
  finishedAt?: string;
  message?: string;
};

export type StartMaxidoorsImportOptions = {
  catalog: MaxidoorsCatalogKey | string;
  categoryId?: string;
  supplierId?: string;
  limit?: number;
  delayMs?: number;
  skipExisting?: boolean;
};

type ResolvedAttrSlot = {
  rule: MaxidoorsAttrRule;
  slug: string;
  isFk: boolean;
};

function normalizeSupplierProductUrl(url: string): string {
  return url.trim().split('#')[0].replace(/\/?$/, '/').toLowerCase();
}

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

    void this.runJob(jobId, catalog, {
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
    catalog: MaxidoorsCatalogConfig,
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

    job.status = 'running';

    const category = await this.resolveCategory(catalog, opts.categoryId);
    job.categoryId = category.id;

    const supplierId = await this.resolveSupplierId(opts.supplierId);
    job.supplierId = supplierId;
    if (!supplierId) {
      throw new BadRequestException(
        'Поставщик «Максидорс» не найден. Укажите supplierId или заведите поставщика с сайтом maxi-doors.ru',
      );
    }

    const attrSlots = await this.ensureAttrSlots(category.id, catalog.attrRules);
    const categoryName = category.name;

    // Сбрасываем «новые» пометки прошлого прогона в этой категории у Максидорс.
    await this.prisma.productSupplier.updateMany({
      where: {
        supplierId,
        product: { categoryId: category.id },
        supplierCatalogNewAt: { not: null },
      },
      data: { supplierCatalogNewAt: null },
    });

    // Полный листинг раздела — и для импорта, и для поиска пропавших.
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
        const result = await this.importOneListing(listing, {
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

    job.missingItems = await this.findMissingSupplierProducts({
      categoryId: category.id,
      supplierId,
      listingUrlSet,
    });

    await this.syncCatalogMissingFlags({
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

  private async syncCatalogMissingFlags(opts: {
    categoryId: string;
    supplierId: string;
    missingProductIds: string[];
  }) {
    const missingIds = opts.missingProductIds;
    await this.prisma.productSupplier.updateMany({
      where: {
        supplierId: opts.supplierId,
        product: { categoryId: opts.categoryId },
        supplierCatalogMissingAt: { not: null },
        ...(missingIds.length > 0 ? { productId: { notIn: missingIds } } : {}),
      },
      data: { supplierCatalogMissingAt: null },
    });

    if (missingIds.length === 0) return;

    await this.prisma.productSupplier.updateMany({
      where: {
        supplierId: opts.supplierId,
        productId: { in: missingIds },
      },
      data: { supplierCatalogMissingAt: new Date() },
    });
  }

  private async findMissingSupplierProducts(opts: {
    categoryId: string;
    supplierId: string;
    listingUrlSet: Set<string>;
  }): Promise<MaxidoorsImportItemRef[]> {
    const links = await this.prisma.productSupplier.findMany({
      where: {
        supplierId: opts.supplierId,
        product: { categoryId: opts.categoryId },
        supplierProductUrl: { contains: 'maxi-doors.ru', mode: 'insensitive' },
      },
      select: {
        supplierProductUrl: true,
        supplierSku: true,
        product: { select: { id: true, name: true } },
      },
    });

    const missing: MaxidoorsImportItemRef[] = [];
    for (const link of links) {
      const url = (link.supplierProductUrl || '').trim();
      if (!url) continue;
      if (opts.listingUrlSet.has(normalizeSupplierProductUrl(url))) continue;
      missing.push({
        name: link.product.name,
        url,
        productId: link.product.id,
        supplierSku: link.supplierSku,
      });
    }
    missing.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return missing;
  }

  private async resolveCategory(
    catalog: MaxidoorsCatalogConfig,
    explicitId?: string,
  ): Promise<{ id: string; name: string }> {
    if (explicitId?.trim()) {
      const byId = await this.prisma.category.findUnique({ where: { id: explicitId.trim() } });
      if (byId) return { id: byId.id, name: byId.name };
      throw new BadRequestException(`Категория ${explicitId} не найдена`);
    }

    if (catalog.defaultCategoryId) {
      const byDefault = await this.prisma.category.findUnique({
        where: { id: catalog.defaultCategoryId },
      });
      if (byDefault) return { id: byDefault.id, name: byDefault.name };
    }

    for (const name of maxidoorsCatalogCategoryNames(catalog)) {
      const byName = await this.prisma.category.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      if (byName) return { id: byName.id, name: byName.name };
    }

    throw new BadRequestException(
      `Категория «${catalog.categoryName}» не найдена. Создайте её или передайте categoryId.`,
    );
  }

  private async ensureAttrSlots(
    categoryId: string,
    rules: MaxidoorsAttrRule[],
  ): Promise<ResolvedAttrSlot[]> {
    const links = await this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      include: { attribute: true },
    });
    const byName = (name: string) =>
      links.find((l) => l.attribute.name.trim().toLowerCase() === name.toLowerCase());

    const slots: ResolvedAttrSlot[] = [];

    for (const rule of rules) {
      if (rule.kind === 'manufacturer') {
        const link = byName('Производитель');
        const slug = link?.attribute.slug ?? 'manufacturer';
        const isFk = normalizeSlug(slug) === 'manufacturer';
        slots.push({ rule, slug, isFk });
        continue;
      }

      if (rule.kind === 'coatingMaterial') {
        const link = byName('Материал покрытия');
        const slug = link?.attribute.slug ?? 'coating-material';
        const isFk = normalizeSlug(slug) === 'coating-material';
        slots.push({ rule, slug, isFk });
        continue;
      }

      if (rule.kind === 'colorFromName') {
        const name = rule.name || 'Цвет';
        const preferredSlug = rule.slug || 'tsvet';
        const link = byName(name);
        let slug = link?.attribute.slug ?? null;
        if (!slug) {
          slug = await this.ensureAttributeOnCategory(categoryId, {
            name,
            slug: preferredSlug,
            order: rule.order ?? 20,
          });
        }
        slots.push({ rule, slug, isFk: false });
        continue;
      }

      if (rule.kind === 'json') {
        const link = byName(rule.name);
        let slug = link?.attribute.slug ?? null;
        if (!slug) {
          slug = await this.ensureAttributeOnCategory(categoryId, {
            name: rule.name,
            slug: rule.slug,
            order: rule.order ?? 50,
          });
        }
        slots.push({ rule, slug, isFk: false });
      }
    }

    return slots;
  }

  private async ensureAttributeOnCategory(
    categoryId: string,
    data: { name: string; slug: string; order: number },
  ): Promise<string> {
    let attr = await this.prisma.attribute.findUnique({ where: { slug: data.slug } });
    if (!attr) {
      attr = await this.prisma.attribute.create({
        data: {
          name: data.name,
          slug: data.slug,
          type: 'TEXT',
          isFilterable: true,
          order: data.order,
        },
      });
    }
    const existing = await this.prisma.categoryAttribute.findUnique({
      where: {
        categoryId_attributeId: { categoryId, attributeId: attr.id },
      },
    });
    if (!existing) {
      const maxOrder = await this.prisma.categoryAttribute.aggregate({
        where: { categoryId },
        _max: { order: true },
      });
      await this.prisma.categoryAttribute.create({
        data: {
          categoryId,
          attributeId: attr.id,
          order: (maxOrder._max.order ?? -1) + 1,
        },
      });
    }
    return attr.slug;
  }

  private async resolveSupplierId(explicit?: string): Promise<string | null> {
    if (explicit) {
      const s = await this.prisma.supplier.findUnique({ where: { id: explicit } });
      if (s) return s.id;
    }

    const found = await this.prisma.supplier.findFirst({
      where: {
        OR: [
          { website: { contains: 'maxi-doors', mode: 'insensitive' } },
          { website: { contains: 'maxidoors', mode: 'insensitive' } },
          { legalName: { contains: 'аксидорс', mode: 'insensitive' } },
          { commercialName: { contains: 'аксидорс', mode: 'insensitive' } },
          { name: { contains: 'аксидорс', mode: 'insensitive' } },
        ],
      },
    });
    return found?.id ?? null;
  }

  private async resolveManufacturerId(value: string | null): Promise<string | null> {
    if (!value) return null;
    const name = value
      .replace(/^ТМ\s+/i, '')
      .replace(/^\.+/, '')
      .trim();
    if (!name) return null;
    const slug = slugify(name);
    const existing = await this.prisma.manufacturer.findFirst({
      where: { OR: [{ slug }, { name: { equals: name, mode: 'insensitive' } }] },
    });
    if (existing) return existing.id;
    return (
      await this.prisma.manufacturer.create({
        data: { name, slug: slug || `mfg-${Date.now()}`, isActive: true },
      })
    ).id;
  }

  private async resolveCoatingMaterialId(value: string | null): Promise<string | null> {
    if (!value) return null;
    const name = value.trim();
    if (!name) return null;
    const slug = slugify(name);
    const existing = await this.prisma.coatingMaterial.findFirst({
      where: { OR: [{ slug }, { name: { equals: name, mode: 'insensitive' } }] },
    });
    if (existing) return existing.id;
    return (
      await this.prisma.coatingMaterial.create({
        data: { name, slug: slug || `cm-${Date.now()}`, isActive: true },
      })
    ).id;
  }

  private async importOneListing(
    listing: MaxidoorsListingItem,
    opts: {
      catalog: MaxidoorsCatalogConfig;
      categoryId: string;
      categoryName: string;
      supplierId: string;
      delayMs: number;
      skipExisting: boolean;
      attrSlots: ResolvedAttrSlot[];
    },
  ): Promise<{ status: 'created' | 'skipped'; item?: MaxidoorsImportItemRef }> {
    if (opts.skipExisting) {
      const existingLink = await this.prisma.productSupplier.findFirst({
        where: {
          OR: [
            { supplierProductUrl: listing.url },
            { supplierProductUrl: listing.url.replace(/\/$/, '') },
            { supplierProductUrl: `${listing.url.replace(/\/$/, '')}/` },
          ],
        },
      });
      if (existingLink) {
        // Товар снова есть у поставщика — снимаем пометку «отсутствует».
        if (existingLink.supplierCatalogMissingAt) {
          await this.prisma.productSupplier.update({
            where: { id: existingLink.id },
            data: { supplierCatalogMissingAt: null },
          });
        }
        return { status: 'skipped' };
      }
    }

    const detail = await fetchDetail(listing.url, opts.delayMs);
    const name = (detail.title || listing.name).replace(/\s+/g, ' ').trim();
    const price = listing.price ?? detail.price ?? 0;
    if (!price || price <= 0) {
      throw new Error('Не удалось определить цену');
    }

    const onOrder = detail.onOrder || listing.onOrder;
    const stock = onOrder ? 0 : 100;
    const supplierSku = (detail.supplierSku || '').trim();

    const remoteImages = mergeProductImages({
      listingImageUrl: listing.thumbUrl,
      detailImageUrls: detail.images,
      supplierSku: supplierSku || null,
    });
    const downloaded = await downloadMaxidoorsImagesToUploads(
      remoteImages,
      listing.productKey,
      opts.catalog.imageFilePrefix,
    );
    const images = downloaded.length > 0 ? downloaded : remoteImages;

    const attributes: Array<{ name: string; value: string; slug: string }> = [];
    let manufacturerId: string | null = null;
    let coatingMaterialId: string | null = null;
    const mappedCharLabels: string[] = [];

    for (const slot of opts.attrSlots) {
      const { rule, slug, isFk } = slot;

      if (rule.kind === 'colorFromName') {
        const color = extractColorFromName(name);
        if (color) {
          attributes.push({ name: rule.name || 'Цвет', value: color, slug });
        }
        continue;
      }

      if (rule.kind === 'manufacturer') {
        const value = detail.manufacturer || findCharValue(detail.charRows, 'Производитель');
        if (value) mappedCharLabels.push('Производитель');
        if (isFk) {
          manufacturerId = await this.resolveManufacturerId(value);
        } else if (value) {
          attributes.push({ name: 'Производитель', value, slug });
        }
        continue;
      }

      if (rule.kind === 'coatingMaterial') {
        const label = rule.charLabel || 'Материал покрытия';
        const value = detail.coatingMaterial || findCharValue(detail.charRows, label);
        if (value) mappedCharLabels.push(label);
        if (isFk) {
          coatingMaterialId = await this.resolveCoatingMaterialId(value);
        } else if (value) {
          attributes.push({ name: 'Материал покрытия', value, slug });
        }
        continue;
      }

      if (rule.kind === 'json') {
        const value = findCharValue(detail.charRows, rule.charLabel);
        if (value) {
          mappedCharLabels.push(rule.charLabel);
          attributes.push({ name: rule.name, value, slug });
        }
      }
    }

    const description =
      buildMaxidoorsProductDescription(
        detail.charRows,
        detail.extraDescription || '',
        mappedCharLabels,
      ) || null;

    const seo = buildSeoFields(name, opts.categoryName, opts.catalog.seoExtraKeywords);
    const slugBase =
      slugify(`${opts.catalog.slugPrefix}-${name}-${listing.productKey}`) ||
      `${opts.catalog.slugPrefix}-${Date.now()}`;
    const productSlug = await this.uniqueSlug(slugBase);
    const sku = await this.uniqueSku();

    const product = await this.prisma.product.create({
      data: {
        name,
        slug: productSlug,
        description,
        shortDescription: seo.shortDescription,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        seoKeywords: seo.seoKeywords,
        price: new Prisma.Decimal(price),
        stock,
        onOrder,
        isActive: true,
        isNew: false,
        categoryId: opts.categoryId,
        images,
        attributes: attributes as unknown as Prisma.InputJsonValue,
        sizes: [],
        openingSide: [],
        sku,
        ...(manufacturerId ? { manufacturerId } : {}),
        ...(coatingMaterialId ? { coatingMaterialId } : {}),
      },
    });

    await this.prisma.productSupplier.create({
      data: {
        productId: product.id,
        supplierId: opts.supplierId,
        supplierSku,
        supplierPrice: new Prisma.Decimal(price),
        supplierProductUrl: listing.url,
        isMainSupplier: true,
        supplierStock: stock,
        supplierCatalogNewAt: new Date(),
        supplierCatalogMissingAt: null,
      },
    });

    return {
      status: 'created',
      item: {
        name,
        url: listing.url,
        productId: product.id,
        supplierSku: supplierSku || null,
      },
    };
  }

  private generateSkuCandidate(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${timestamp}${random}`;
  }

  private async uniqueSku(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const sku = this.generateSkuCandidate();
      const exists = await this.prisma.product.findUnique({ where: { sku } });
      if (!exists) return sku;
    }
    return `md-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base.slice(0, 80);
    let i = 2;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base.slice(0, 70)}-${i}`;
      i += 1;
    }
    return slug;
  }
}
