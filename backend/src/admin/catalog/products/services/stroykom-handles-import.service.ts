import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../../../database/prisma.service';

const BASE = 'https://436830.ru';
const HANDLES_CATEGORY_ID = 53;
export const DEFAULT_HANDLES_TARGET_CATEGORY_ID = 'cmrkk0jq4002prjl64owdkzcl';
const LIST_PATH = '/furnitura/2024-08-06-08-51-35.html';
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

type ListingItem = {
  productId: string;
  name: string;
  colorCode: string | null;
  price: number | null;
  thumbUrl: string | null;
  url: string;
};

type DetailData = {
  title: string;
  subtitle: string | null;
  price: number | null;
  brand: string | null;
  manufacturer: string | null;
  descriptionHtml: string;
  fullImages: string[];
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

    let listings = await this.scrapeAllListings(opts.delayMs);
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
    // Wait until done/error
    for (;;) {
      const job = this.getJob(jobId);
      if (job.status === 'done' || job.status === 'error') return job;
      await sleep(400);
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
      // Prefer FK manufacturer if no attribute named Производитель
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

  private async scrapeAllListings(delayMs: number): Promise<ListingItem[]> {
    const all: ListingItem[] = [];
    for (const limitstart of [0, 100]) {
      const url = `${BASE}${LIST_PATH}?page=shop.browse&category_id=${HANDLES_CATEGORY_ID}&limit=100&limitstart=${limitstart}`;
      this.logger.log(`Listing: ${url}`);
      const html = await fetchHtml(url);
      const items = parseListingHtml(html);
      this.logger.log(`  → ${items.length} позиций`);
      all.push(...items);
      await sleep(delayMs);
    }
    const byId = new Map(all.map((i) => [i.productId, i]));
    return [...byId.values()];
  }

  private async importOneListing(
    listing: ListingItem,
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

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/_/g, '-');
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function absUrl(href: string): string {
  if (!href) return href;
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href.replace(/^http:\/\//i, 'https://');
  }
  if (href.startsWith('//')) return `https:${href}`;
  return new URL(href.replace(/^\/\//, '/'), BASE).toString();
}

function slugify(value: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };
  return value
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeColorCode(code: string): string {
  return code
    .replace(/\s+/g, '')
    .replace(/Н/gi, 'H')
    .replace(/Р/gi, 'P')
    .replace(/В/gi, 'B')
    .replace(/С/gi, 'C')
    .toUpperCase();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; TerritoryInteriorImporter/1.0; +https://territory-interior.ru)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseListingHtml(html: string): ListingItem[] {
  const parts = html.split(/onMouseOver="this\.style\.boxShadow/);
  const items: ListingItem[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const idM = part.match(/product_id=(\d+)/);
    if (!idM) continue;
    const nameM = part.match(/font-size:15px;font-weight:bold;[^>]*>([^<]+)</);
    if (!nameM) continue;

    const colorM =
      part.match(/<b>\(\s*([^)]+?)\s*\)<\/a>/i) ||
      part.match(/font-size:13px[^>]*>[\s\S]*?\(\s*([^)]+?)\s*\)/i);
    const priceM = part.match(/([\d\s\u00a0]+)\s*руб/i);
    const imgM =
      part.match(/src="([^"]*show_image_in_imgtag\.php[^"]*)"/i) ||
      part.match(/src="([^"]*shop_image\/product[^"]*)"/i);

    const productId = idM[1];
    if (seen.has(productId)) continue;
    seen.add(productId);

    const priceRaw = priceM?.[1]?.replace(/[\s\u00a0]/g, '') ?? '';
    const url = `${BASE}${LIST_PATH}?page=shop.product_details&flypage=flypage.tpl+1&product_id=${productId}&category_id=${HANDLES_CATEGORY_ID}`;

    items.push({
      productId,
      name: nameM[1].replace(/\s+/g, ' ').trim(),
      colorCode: colorM?.[1]?.trim() || null,
      price: priceRaw ? Number(priceRaw) : null,
      thumbUrl: imgM?.[1] ? absUrl(imgM[1].replace(/&amp;/g, '&')) : null,
      url,
    });
  }

  return items;
}

function parseDetailHtml(html: string): DetailData {
  const $ = cheerio.load(html);
  const h1 = $('#vmMainPage h1').first();
  const title = h1.clone().children('span').remove().end().text().replace(/\s+/g, ' ').trim();
  const subtitle = h1.find('span').text().replace(/\s+/g, ' ').trim() || null;

  const priceText = $('.productPrice').first().text();
  const priceM = priceText.match(/([\d\s\u00a0]+)/);
  const price = priceM ? Number(priceM[1].replace(/[\s\u00a0]/g, '')) : null;

  const contentHtml =
    $('#vmMainPage td[colspan="2"] hr').parent().html() || $('#vmMainPage').html() || '';

  const $content = cheerio.load(`<div id="sk-wrap">${contentHtml}</div>`);
  const text = $content('#sk-wrap').text().replace(/\s+/g, ' ').trim();

  const brandM = text.match(/Торговая марка:\s*(.+?)(?:Производитель|Наименование|$)/i);
  const manufacturerM = text.match(
    /Производитель:\s*\.?\s*(.+?)(?:Наименование|Варианты|Описание|Комплектация|$)/i,
  );

  const fullImages: string[] = [];
  $('a[rel^="lightbox"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (/uvelich\.png|M_images|banners/i.test(href)) return;
    fullImages.push(absUrl(href));
  });

  const descParts: string[] = [];
  $('#vmMainPage td[colspan="2"] p').each((_, p) => {
    const htmlP = ($(p).html() || '').trim();
    if (htmlP) descParts.push(`<p>${htmlP}</p>`);
  });

  // Fallback: structured plain text from known sections
  let descriptionHtml =
    descParts.length > 0 ? descParts.join('\n') : `<p>${escapeHtml(text.slice(0, 4000))}</p>`;

  // Prefer richer plain reconstruction when paragraphs are sparse
  if (descParts.length < 2 && text.length > 80) {
    descriptionHtml = `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(
      rebuildDescriptionText(text),
    )}</pre>`;
  }

  return {
    title: title || 'Ручка',
    subtitle,
    price,
    brand: brandM?.[1]?.trim() || null,
    manufacturer: manufacturerM?.[1]?.trim() || null,
    descriptionHtml,
    fullImages: [...new Set(fullImages)],
  };
}

function rebuildDescriptionText(text: string): string {
  return text
    .replace(/Торговая марка:/gi, '\nТорговая марка:')
    .replace(/Производитель:/gi, '\nПроизводитель:')
    .replace(/Наименование:/gi, '\nНаименование:')
    .replace(/Варианты цветов:/gi, '\nВарианты цветов:')
    .replace(/Описание:/gi, '\nОписание:')
    .replace(/Комплектация:/gi, '\nКомплектация:')
    .replace(/•/g, '\n• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchDetail(url: string, delayMs: number): Promise<DetailData> {
  const html = await fetchHtml(url);
  await sleep(delayMs);
  return parseDetailHtml(html);
}
