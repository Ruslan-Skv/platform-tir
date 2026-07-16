import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../../../database/prisma.service';
import {
  escapeHtml,
  fetchDetail,
  normalizeColorCode,
  normalizeSlug,
  scrapeAllHandleListings,
  slugify,
  type StroykomHandlesListingItem,
} from './stroykom-handles-scrape';

export const DEFAULT_HANDLES_TARGET_CATEGORY_ID = 'cmrkk0jq4002prjl64owdkzcl';
const DEFAULT_SUPPLIER_ID_PROD = 'cmmvshxbi0016phv7ufr2e0uu';

export type StroykomHandlesImportJobStatus = 'pending' | 'running' | 'done' | 'error';

export type StroykomHandlesImportJob = {
  id: string;
  status: StroykomHandlesImportJobStatus;
  categoryId: string;
  supplierId: string | null;
  total: number;
  done: number;
  created: number;
  skipped: number;
  errors: string[];
  startedAt: string;
  finishedAt?: string;
  message?: string;
};

type StartImportOptions = {
  categoryId?: string;
  supplierId?: string;
  limit?: number;
  delayMs?: number;
  skipExisting?: boolean;
  ensureCategory?: boolean;
};

@Injectable()
export class StroykomHandlesImportService {
  private readonly logger = new Logger(StroykomHandlesImportService.name);
  private readonly jobs = new Map<string, StroykomHandlesImportJob>();

  constructor(private readonly prisma: PrismaService) {}

  getJob(jobId: string): StroykomHandlesImportJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException(`Import job ${jobId} not found`);
    return job;
  }

  startImport(opts: StartImportOptions = {}): { jobId: string } {
    const jobId = randomUUID();
    const job: StroykomHandlesImportJob = {
      id: jobId,
      status: 'pending',
      categoryId: opts.categoryId?.trim() || DEFAULT_HANDLES_TARGET_CATEGORY_ID,
      supplierId: opts.supplierId?.trim() || null,
      total: 0,
      done: 0,
      created: 0,
      skipped: 0,
      errors: [],
      startedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    void this.runJob(jobId, {
      limit: opts.limit,
      delayMs: opts.delayMs ?? 300,
      skipExisting: opts.skipExisting !== false,
      ensureCategory: opts.ensureCategory === true,
    }).catch((err) => {
      const j = this.jobs.get(jobId);
      if (!j) return;
      j.status = 'error';
      j.message = err instanceof Error ? err.message : String(err);
      j.finishedAt = new Date().toISOString();
      this.logger.error(`Stroykom handles import ${jobId} failed`, err);
    });

    return { jobId };
  }

  private async runJob(
    jobId: string,
    opts: { limit?: number; delayMs: number; skipExisting: boolean; ensureCategory: boolean },
  ) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.categoryId = await this.resolveCategoryId(job.categoryId, opts.ensureCategory);

    const category = await this.prisma.category.findUnique({ where: { id: job.categoryId } });
    if (!category) {
      throw new BadRequestException(`Категория ${job.categoryId} не найдена`);
    }

    const supplierId = await this.resolveSupplierId(job.supplierId ?? undefined);
    job.supplierId = supplierId;

    if (!supplierId) {
      throw new BadRequestException(
        'Поставщик Стройком не найден. Укажите supplierId или заведите поставщика с сайтом 436830.ru',
      );
    }

    const attrMap = await this.ensureCategoryAttributeSlugs(job.categoryId);

    let listings = await scrapeAllHandleListings(opts.delayMs, (url, count) => {
      this.logger.log(`Listing: ${url}`);
      this.logger.log(`  → ${count} позиций`);
    });
    if (opts.limit && opts.limit > 0) {
      listings = listings.slice(0, opts.limit);
    }
    job.total = listings.length;

    for (const listing of listings) {
      try {
        const result = await this.importOneListing(listing, {
          categoryId: job.categoryId,
          supplierId,
          delayMs: opts.delayMs,
          skipExisting: opts.skipExisting,
          attrMap,
        });
        if (result === 'created') job.created += 1;
        else job.skipped += 1;
      } catch (e) {
        const msg = `${listing.productId} ${listing.name}: ${e instanceof Error ? e.message : String(e)}`;
        job.errors.push(msg);
        this.logger.warn(msg);
      } finally {
        job.done += 1;
      }
    }

    job.status = 'done';
    job.finishedAt = new Date().toISOString();
    job.message = `Создано ${job.created}, пропущено ${job.skipped}, ошибок ${job.errors.length}`;
  }

  /** CLI / tests: sync import without job API. */
  async importSync(opts: StartImportOptions = {}) {
    const { jobId } = this.startImport(opts);
    for (;;) {
      const job = this.getJob(jobId);
      if (job.status === 'done' || job.status === 'error') return job;
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  private async resolveCategoryId(preferredId: string, ensure: boolean): Promise<string> {
    const existing = await this.prisma.category.findUnique({ where: { id: preferredId } });
    if (existing) return existing.id;

    const bySlug = await this.prisma.category.findFirst({
      where: {
        OR: [{ slug: 'ruchki' }, { name: { equals: 'Ручки', mode: 'insensitive' } }],
      },
    });
    if (bySlug) return bySlug.id;

    if (!ensure) {
      throw new BadRequestException(
        `Категория ${preferredId} не найдена. Передайте ensureCategory=true или создайте «Ручки».`,
      );
    }

    let parent = await this.prisma.category.findFirst({
      where: {
        OR: [
          { slug: 'furnitura-dlya-dverey' },
          { slug: 'door-hardware' },
          { name: { contains: 'урнитур', mode: 'insensitive' } },
        ],
      },
    });

    if (!parent) {
      parent = await this.prisma.category.create({
        data: {
          name: 'Фурнитура',
          slug: 'door-hardware',
          description: 'Фурнитура для дверей',
          sizesRequired: false,
          isActive: true,
          order: 50,
        },
      });
    }

    const child = await this.prisma.category.create({
      data: {
        name: 'Ручки',
        slug: 'ruchki',
        parentId: parent.id,
        sizesRequired: false,
        isActive: true,
        order: 10,
      },
    });
    return child.id;
  }

  private async ensureCategoryAttributeSlugs(categoryId: string): Promise<{
    manufacturerSlug: string | null;
    manufacturerIsFk: boolean;
    brandSlug: string;
  }> {
    const links = await this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      include: { attribute: true },
    });

    const byName = (name: string) =>
      links.find((l) => l.attribute.name.trim().toLowerCase() === name.toLowerCase());

    const manufacturerLink = byName('Производитель');
    const brandLink = byName('Торговая марка');

    let manufacturerSlug = manufacturerLink?.attribute.slug ?? null;
    const manufacturerIsFk = manufacturerSlug
      ? normalizeSlug(manufacturerSlug) === 'manufacturer'
      : false;

    let brandSlug = brandLink?.attribute.slug ?? null;
    if (!brandSlug) {
      brandSlug = await this.ensureAttributeOnCategory(categoryId, {
        name: 'Торговая марка',
        slug: 'torgovaya-marka',
        order: 10,
      });
    }

    if (!manufacturerSlug && !manufacturerIsFk) {
      manufacturerSlug = 'manufacturer';
    }

    return {
      manufacturerSlug,
      manufacturerIsFk: manufacturerIsFk || manufacturerSlug === 'manufacturer',
      brandSlug,
    };
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
    const byProdId = await this.prisma.supplier.findUnique({
      where: { id: DEFAULT_SUPPLIER_ID_PROD },
    });
    if (byProdId) return byProdId.id;

    const found = await this.prisma.supplier.findFirst({
      where: {
        OR: [
          { website: { contains: '436830', mode: 'insensitive' } },
          { legalName: { contains: 'тройком', mode: 'insensitive' } },
          { commercialName: { contains: 'тройком', mode: 'insensitive' } },
          { name: { contains: 'тройком', mode: 'insensitive' } },
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
    const created = await this.prisma.manufacturer.create({
      data: { name, slug: slug || `mfg-${Date.now()}`, isActive: true },
    });
    return created.id;
  }

  private async importOneListing(
    listing: StroykomHandlesListingItem,
    opts: {
      categoryId: string;
      supplierId: string;
      delayMs: number;
      skipExisting: boolean;
      attrMap: {
        manufacturerSlug: string | null;
        manufacturerIsFk: boolean;
        brandSlug: string;
      };
    },
  ): Promise<'created' | 'skipped'> {
    const supplierSku = `SK-H-${listing.productId}`;

    if (opts.skipExisting) {
      const existingLink = await this.prisma.productSupplier.findFirst({
        where: {
          OR: [{ supplierProductUrl: listing.url }, { supplierId: opts.supplierId, supplierSku }],
        },
      });
      if (existingLink) return 'skipped';
    }

    const detail = await fetchDetail(listing.url, opts.delayMs);
    const colorSuffix = listing.colorCode ? ` (${normalizeColorCode(listing.colorCode)})` : '';
    const name = `${listing.name}${colorSuffix}`.replace(/\s+/g, ' ').trim();

    const price = listing.price ?? detail.price ?? 0;
    if (!price || price <= 0) {
      throw new Error('Не удалось определить цену');
    }

    const images = [
      ...new Set([...detail.fullImages, listing.thumbUrl].filter((x): x is string => Boolean(x))),
    ].slice(0, 8);

    let description = detail.descriptionHtml;
    if (detail.subtitle) {
      description = `<p><em>${escapeHtml(detail.subtitle)}</em></p>\n${description}`;
    }

    const attributes: Array<{ name: string; value: string; slug: string }> = [];
    if (detail.brand) {
      attributes.push({
        name: 'Торговая марка',
        value: detail.brand,
        slug: opts.attrMap.brandSlug,
      });
    }

    let manufacturerId: string | null = null;
    if (opts.attrMap.manufacturerIsFk) {
      manufacturerId = await this.resolveManufacturerId(detail.manufacturer);
    } else if (detail.manufacturer && opts.attrMap.manufacturerSlug) {
      attributes.push({
        name: 'Производитель',
        value: detail.manufacturer,
        slug: opts.attrMap.manufacturerSlug,
      });
    }

    const slugBase =
      slugify(`ruchka-${listing.name}-${listing.colorCode || ''}-${listing.productId}`) ||
      `ruchka-${listing.productId}`;
    const slug = await this.uniqueSlug(slugBase);

    const product = await this.prisma.product.create({
      data: {
        name,
        slug,
        description,
        price: new Prisma.Decimal(price),
        stock: 100,
        onOrder: false,
        isActive: true,
        isNew: false,
        categoryId: opts.categoryId,
        images,
        attributes: attributes as unknown as Prisma.InputJsonValue,
        sizes: [],
        openingSide: [],
        sku: supplierSku,
        ...(manufacturerId ? { manufacturerId } : {}),
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
        supplierStock: 100,
      },
    });

    return 'created';
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
