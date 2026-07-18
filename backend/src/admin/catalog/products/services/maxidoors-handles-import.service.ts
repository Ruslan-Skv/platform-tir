import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../../../database/prisma.service';
import {
  buildSeoFields,
  downloadMaxidoorsImagesToUploads,
  extractColorFromName,
  fetchDetail,
  mergeProductImages,
  normalizeSlug,
  scrapeAllHandleListings,
  slugify,
  type MaxidoorsHandlesListingItem,
} from './maxidoors-handles-scrape';

/** Прод-категория «Ручки (м)» под «Фурнитура». */
export const DEFAULT_MAXIDOORS_HANDLES_CATEGORY_ID = 'cmrq8cmcb00im11w2bxnf0m6i';

export type MaxidoorsHandlesImportJobStatus = 'pending' | 'running' | 'done' | 'error';

export type MaxidoorsHandlesImportJob = {
  id: string;
  status: MaxidoorsHandlesImportJobStatus;
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
};

type AttrMap = {
  manufacturerSlug: string | null;
  manufacturerIsFk: boolean;
  coatingSlug: string | null;
  coatingIsFk: boolean;
  colorSlug: string;
};

@Injectable()
export class MaxidoorsHandlesImportService {
  private readonly logger = new Logger(MaxidoorsHandlesImportService.name);
  private readonly jobs = new Map<string, MaxidoorsHandlesImportJob>();

  constructor(private readonly prisma: PrismaService) {}

  getJob(jobId: string): MaxidoorsHandlesImportJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException(`Import job ${jobId} not found`);
    return job;
  }

  startImport(opts: StartImportOptions = {}): { jobId: string } {
    const jobId = randomUUID();
    const job: MaxidoorsHandlesImportJob = {
      id: jobId,
      status: 'pending',
      categoryId: opts.categoryId?.trim() || DEFAULT_MAXIDOORS_HANDLES_CATEGORY_ID,
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
      delayMs: opts.delayMs ?? 350,
      skipExisting: opts.skipExisting !== false,
    }).catch((err) => {
      const j = this.jobs.get(jobId);
      if (!j) return;
      j.status = 'error';
      j.message = err instanceof Error ? err.message : String(err);
      j.finishedAt = new Date().toISOString();
      this.logger.error(`MaxiDoors handles import ${jobId} failed`, err);
    });

    return { jobId };
  }

  async importSync(opts: StartImportOptions = {}) {
    const { jobId } = this.startImport(opts);
    for (;;) {
      const job = this.getJob(jobId);
      if (job.status === 'done' || job.status === 'error') return job;
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  private async runJob(
    jobId: string,
    opts: { limit?: number; delayMs: number; skipExisting: boolean },
  ) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';

    const category = await this.prisma.category.findUnique({ where: { id: job.categoryId } });
    if (!category) {
      throw new BadRequestException(`Категория ${job.categoryId} не найдена`);
    }

    const supplierId = await this.resolveSupplierId(job.supplierId ?? undefined);
    job.supplierId = supplierId;
    if (!supplierId) {
      throw new BadRequestException(
        'Поставщик «Максидорс» не найден. Укажите supplierId или заведите поставщика с сайтом maxi-doors.ru',
      );
    }

    const attrMap = await this.ensureCategoryAttributeSlugs(job.categoryId);
    const categoryName = category.name;

    let listings = await scrapeAllHandleListings(opts.delayMs, (url, count) => {
      this.logger.log(`Listing: ${url} → ${count}`);
    });
    if (opts.limit && opts.limit > 0) {
      listings = listings.slice(0, opts.limit);
    }
    job.total = listings.length;

    for (const listing of listings) {
      try {
        const result = await this.importOneListing(listing, {
          categoryId: job.categoryId,
          categoryName,
          supplierId,
          delayMs: opts.delayMs,
          skipExisting: opts.skipExisting,
          attrMap,
        });
        if (result === 'created') job.created += 1;
        else job.skipped += 1;
      } catch (e) {
        const msg = `${listing.productKey}: ${e instanceof Error ? e.message : String(e)}`;
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

  private async ensureCategoryAttributeSlugs(categoryId: string): Promise<AttrMap> {
    const links = await this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      include: { attribute: true },
    });

    const byName = (name: string) =>
      links.find((l) => l.attribute.name.trim().toLowerCase() === name.toLowerCase());

    const manufacturerLink = byName('Производитель');
    const coatingLink = byName('Материал покрытия');
    const colorLink = byName('Цвет');

    let manufacturerSlug = manufacturerLink?.attribute.slug ?? null;
    const manufacturerIsFk = manufacturerSlug
      ? normalizeSlug(manufacturerSlug) === 'manufacturer'
      : true;

    let coatingSlug = coatingLink?.attribute.slug ?? null;
    const coatingIsFk = coatingSlug ? normalizeSlug(coatingSlug) === 'coating-material' : true;

    let colorSlug = colorLink?.attribute.slug ?? null;
    if (!colorSlug) {
      colorSlug = await this.ensureAttributeOnCategory(categoryId, {
        name: 'Цвет',
        slug: 'tsvet',
        order: 20,
      });
    }

    if (!manufacturerSlug) manufacturerSlug = 'manufacturer';
    if (!coatingSlug) coatingSlug = 'coating-material';

    return {
      manufacturerSlug,
      manufacturerIsFk: manufacturerIsFk || manufacturerSlug === 'manufacturer',
      coatingSlug,
      coatingIsFk: coatingIsFk || coatingSlug === 'coating-material',
      colorSlug,
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
    listing: MaxidoorsHandlesListingItem,
    opts: {
      categoryId: string;
      categoryName: string;
      supplierId: string;
      delayMs: number;
      skipExisting: boolean;
      attrMap: AttrMap;
    },
  ): Promise<'created' | 'skipped'> {
    if (opts.skipExisting) {
      const existingLink = await this.prisma.productSupplier.findFirst({
        where: { supplierProductUrl: listing.url },
      });
      if (existingLink) return 'skipped';
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
    const downloaded = await downloadMaxidoorsImagesToUploads(remoteImages, listing.productKey);
    const images = downloaded.length > 0 ? downloaded : remoteImages;

    const attributes: Array<{ name: string; value: string; slug: string }> = [];
    const color = extractColorFromName(name);
    if (color) {
      attributes.push({ name: 'Цвет', value: color, slug: opts.attrMap.colorSlug });
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

    let coatingMaterialId: string | null = null;
    if (opts.attrMap.coatingIsFk) {
      coatingMaterialId = await this.resolveCoatingMaterialId(detail.coatingMaterial);
    } else if (detail.coatingMaterial && opts.attrMap.coatingSlug) {
      attributes.push({
        name: 'Материал покрытия',
        value: detail.coatingMaterial,
        slug: opts.attrMap.coatingSlug,
      });
    }

    const seo = buildSeoFields(name, opts.categoryName);
    const slugBase = slugify(`ruchka-m-${name}-${listing.productKey}`) || `ruchka-m-${Date.now()}`;
    const slug = await this.uniqueSlug(slugBase);
    const sku = await this.uniqueSku();

    const product = await this.prisma.product.create({
      data: {
        name,
        slug,
        description: detail.description || null,
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
      },
    });

    return 'created';
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
