import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../../../database/prisma.service';
import {
  maxidoorsCatalogCategoryNames,
  type MaxidoorsAttrRule,
  type MaxidoorsCatalogConfig,
} from './maxidoors-catalogs';
import type { MaxidoorsImportItemRef, ResolvedAttrSlot } from './maxidoors-import.types';
import { normalizeSupplierProductUrl } from './maxidoors-import.types';
import {
  buildMaxidoorsProductDescription,
  buildSeoFields,
  downloadMaxidoorsImagesToUploads,
  extractColorFromName,
  fetchDetail,
  findCharValue,
  isMaxidoorsBoilerplateCharRow,
  mergeProductImages,
  normalizeSlug,
  slugify,
  type MaxidoorsListingItem,
} from './maxidoors-scrape';

export async function resolveMaxidoorsCategory(
  prisma: PrismaService,
  catalog: MaxidoorsCatalogConfig,
  explicitId?: string,
): Promise<{ id: string; name: string }> {
  if (explicitId?.trim()) {
    const byId = await prisma.category.findUnique({ where: { id: explicitId.trim() } });
    if (byId) return { id: byId.id, name: byId.name };
    throw new BadRequestException(`Категория ${explicitId} не найдена`);
  }

  if (catalog.defaultCategoryId) {
    const byDefault = await prisma.category.findUnique({
      where: { id: catalog.defaultCategoryId },
    });
    if (byDefault) return { id: byDefault.id, name: byDefault.name };
  }

  for (const name of maxidoorsCatalogCategoryNames(catalog)) {
    const byName = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (byName) return { id: byName.id, name: byName.name };
  }

  throw new BadRequestException(
    `Категория «${catalog.categoryName}» не найдена. Создайте её или передайте categoryId.`,
  );
}

export async function resolveMaxidoorsSupplierId(
  prisma: PrismaService,
  explicit?: string,
): Promise<string | null> {
  if (explicit) {
    const s = await prisma.supplier.findUnique({ where: { id: explicit } });
    if (s) return s.id;
  }

  const found = await prisma.supplier.findFirst({
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

async function ensureAttributeOnCategory(
  prisma: PrismaService,
  categoryId: string,
  data: { name: string; slug: string; order: number },
): Promise<string> {
  let attr = await prisma.attribute.findUnique({ where: { slug: data.slug } });
  if (!attr) {
    attr = await prisma.attribute.create({
      data: {
        name: data.name,
        slug: data.slug,
        type: 'TEXT',
        isFilterable: true,
        order: data.order,
      },
    });
  }
  const existing = await prisma.categoryAttribute.findUnique({
    where: {
      categoryId_attributeId: { categoryId, attributeId: attr.id },
    },
  });
  if (!existing) {
    const maxOrder = await prisma.categoryAttribute.aggregate({
      where: { categoryId },
      _max: { order: true },
    });
    await prisma.categoryAttribute.create({
      data: {
        categoryId,
        attributeId: attr.id,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
  }
  return attr.slug;
}

export async function ensureMaxidoorsAttrSlots(
  prisma: PrismaService,
  categoryId: string,
  rules: MaxidoorsAttrRule[],
): Promise<ResolvedAttrSlot[]> {
  const links = await prisma.categoryAttribute.findMany({
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
        slug = await ensureAttributeOnCategory(prisma, categoryId, {
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
        slug = await ensureAttributeOnCategory(prisma, categoryId, {
          name: rule.name,
          slug: rule.slug,
          order: rule.order ?? 50,
        });
      }
      slots.push({ rule, slug, isFk: false });
      continue;
    }

    if (rule.kind === 'autoChars') {
      // Слоты создаются при импорте по фактическим charRows карточки.
      slots.push({ rule, slug: '', isFk: false });
    }
  }

  return slots;
}

export async function findMissingMaxidoorsProducts(
  prisma: PrismaService,
  opts: {
    categoryId: string;
    supplierId: string;
    listingUrlSet: Set<string>;
  },
): Promise<MaxidoorsImportItemRef[]> {
  const links = await prisma.productSupplier.findMany({
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

export async function syncMaxidoorsCatalogMissingFlags(
  prisma: PrismaService,
  opts: {
    categoryId: string;
    supplierId: string;
    missingProductIds: string[];
  },
) {
  const missingIds = opts.missingProductIds;
  await prisma.productSupplier.updateMany({
    where: {
      supplierId: opts.supplierId,
      product: { categoryId: opts.categoryId },
      supplierCatalogMissingAt: { not: null },
      ...(missingIds.length > 0 ? { productId: { notIn: missingIds } } : {}),
    },
    data: { supplierCatalogMissingAt: null },
  });

  if (missingIds.length === 0) return;

  await prisma.productSupplier.updateMany({
    where: {
      supplierId: opts.supplierId,
      productId: { in: missingIds },
    },
    data: { supplierCatalogMissingAt: new Date() },
  });
}

async function resolveManufacturerId(
  prisma: PrismaService,
  value: string | null,
): Promise<string | null> {
  if (!value) return null;
  const name = value
    .replace(/^ТМ\s+/i, '')
    .replace(/^\.+/, '')
    .trim();
  if (!name) return null;
  const slug = slugify(name);
  const existing = await prisma.manufacturer.findFirst({
    where: { OR: [{ slug }, { name: { equals: name, mode: 'insensitive' } }] },
  });
  if (existing) return existing.id;
  return (
    await prisma.manufacturer.create({
      data: { name, slug: slug || `mfg-${Date.now()}`, isActive: true },
    })
  ).id;
}

async function resolveCoatingMaterialId(
  prisma: PrismaService,
  value: string | null,
): Promise<string | null> {
  if (!value) return null;
  const name = value.trim();
  if (!name) return null;
  const slug = slugify(name);
  const existing = await prisma.coatingMaterial.findFirst({
    where: { OR: [{ slug }, { name: { equals: name, mode: 'insensitive' } }] },
  });
  if (existing) return existing.id;
  return (
    await prisma.coatingMaterial.create({
      data: { name, slug: slug || `cm-${Date.now()}`, isActive: true },
    })
  ).id;
}

function generateSkuCandidate(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${timestamp}${random}`;
}

async function uniqueSku(prisma: PrismaService): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const sku = generateSkuCandidate();
    const exists = await prisma.product.findUnique({ where: { sku } });
    if (!exists) return sku;
  }
  return `md-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

async function uniqueSlug(prisma: PrismaService, base: string): Promise<string> {
  let slug = base.slice(0, 80);
  let i = 2;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${base.slice(0, 70)}-${i}`;
    i += 1;
  }
  return slug;
}

export async function importMaxidoorsOneListing(
  prisma: PrismaService,
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
    const existingLink = await prisma.productSupplier.findFirst({
      where: {
        OR: [
          { supplierProductUrl: listing.url },
          { supplierProductUrl: listing.url.replace(/\/$/, '') },
          { supplierProductUrl: `${listing.url.replace(/\/$/, '')}/` },
        ],
      },
    });
    if (existingLink) {
      if (existingLink.supplierCatalogMissingAt) {
        await prisma.productSupplier.update({
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
        manufacturerId = await resolveManufacturerId(prisma, value);
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
        coatingMaterialId = await resolveCoatingMaterialId(prisma, value);
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
      continue;
    }

    if (rule.kind === 'autoChars') {
      let order = rule.orderStart ?? 100;
      for (const row of detail.charRows) {
        const label = row.label.replace(/:$/, '').trim();
        const value = row.value.trim();
        if (!label || !value) continue;
        if (isMaxidoorsBoilerplateCharRow(label, value)) continue;
        // Размеры → Product.sizes (блок «Варианты исполнения»), не атрибут категории
        if (/^размер$/i.test(label)) continue;
        if (mappedCharLabels.some((x) => x.toLowerCase() === label.toLowerCase())) continue;
        if (attributes.some((a) => a.name.toLowerCase() === label.toLowerCase())) {
          mappedCharLabels.push(label);
          continue;
        }
        const preferredSlug = slugify(label) || `attr-${order}`;
        const attrSlug = await ensureAttributeOnCategory(prisma, opts.categoryId, {
          name: label,
          slug: preferredSlug,
          order,
        });
        attributes.push({ name: label, value, slug: attrSlug });
        mappedCharLabels.push(label);
        order += 1;
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
  const productSlug = await uniqueSlug(prisma, slugBase);
  const sku = await uniqueSku(prisma);

  const product = await prisma.product.create({
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
      sizes: detail.sizes,
      openingSide: detail.openingSides,
      sku,
      ...(manufacturerId ? { manufacturerId } : {}),
      ...(coatingMaterialId ? { coatingMaterialId } : {}),
    },
  });

  await prisma.productSupplier.create({
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
