/**
 * Утилиты для копирования товара. Используются на сервере и клиенте.
 */
import type { CategoryAttributeForCopy, ProductForCopy } from '@/entities/product';

import {
  CATEGORY_ATTR_SLUG_CANVAS_TYPE,
  CATEGORY_ATTR_SLUG_COATING_MATERIAL,
  CATEGORY_ATTR_SLUG_DOOR_THICKNESS,
  CATEGORY_ATTR_SLUG_MANUFACTURER,
  CATEGORY_ATTR_SLUG_WEATHERSTRIP,
} from './catalog-attribute-fk-slugs';

export type { CategoryAttributeForCopy, ProductForCopy };

/** Поля для POST /product-components/product/:newProductId при копировании товара */
export interface CopyProductComponentPayload {
  catalogItemId?: string;
  name: string;
  type: string;
  price: number;
  image?: string;
  stock: number;
  isActive: boolean;
  sortOrder: number;
}

export function mapRawComponentsToCopyPayload(raw: unknown): CopyProductComponentPayload[] {
  if (!Array.isArray(raw)) return [];
  const out: CopyProductComponentPayload[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    const type = typeof o.type === 'string' ? o.type.trim() : '';
    const priceRaw = o.price;
    let price = 0;
    if (typeof priceRaw === 'number') {
      price = priceRaw;
    } else if (typeof priceRaw === 'string') {
      price = parseFloat(priceRaw.replace(',', '.'));
    }
    const catalogItemId =
      typeof o.catalogItemId === 'string' && o.catalogItemId.trim()
        ? o.catalogItemId.trim()
        : undefined;
    const image =
      typeof o.image === 'string' && o.image.trim().length > 0 ? o.image.trim() : undefined;
    const stock = typeof o.stock === 'number' && o.stock >= 0 ? o.stock : 0;
    const isActive = typeof o.isActive === 'boolean' ? o.isActive : true;
    const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;

    if (catalogItemId) {
      out.push({
        catalogItemId,
        name: name || 'Из справочника',
        type: type || '',
        price: Number.isFinite(price) ? price : 0,
        image,
        stock,
        isActive,
        sortOrder,
      });
      continue;
    }

    if (!name || !type || !Number.isFinite(price) || price < 0) continue;
    out.push({ name, type, price, image, stock, isActive, sortOrder });
  }
  out.sort((a, b) => a.sortOrder - b.sortOrder);
  return out;
}

export interface CopiedProductData {
  formData: {
    name: string;
    slug: string;
    sku: string;
    description: string;
    price: string;
    comparePrice: string;
    stock: number;
    onOrder: boolean;
    categoryId: string;
    isActive: boolean;
    isFeatured: boolean;
    isNew: boolean;
    partnerId: string;
    sortOrder: number;
    seoTitle: string;
    seoDescription: string;
    supplierId: string;
    supplierSku: string;
    supplierProductUrl: string;
    supplierPrice: string;
    manufacturerId: string;
    coatingMaterialId: string;
    canvasTypeId: string;
    doorThicknessId: string;
    weatherstripId: string;
    videoUrl: string;
    attributes: Record<string, string>;
    images: string[];
    sizes: string[];
    openingSide: string[];
    catalogBadgeIds: string[];
  };
  categoryAttributes: CategoryAttributeForCopy[];
  customAttributes: { key: string; value: string }[];
  /** Комплектующие исходного товара — создаются для нового товара после POST /products */
  componentsToCopy: CopyProductComponentPayload[];
}

export function mapProductToCopyData(
  product: ProductForCopy,
  categoryAttributes: CategoryAttributeForCopy[],
  rawComponents?: unknown
): CopiedProductData {
  const nameToSlugMap: Record<string, string> = {};
  const categoryAttrNames: string[] = [];
  const categoryAttrSlugs: string[] = [];
  categoryAttributes.forEach((ca) => {
    nameToSlugMap[ca.attribute.name] = ca.attribute.slug;
    categoryAttrNames.push(ca.attribute.name);
    categoryAttrSlugs.push(ca.attribute.slug);
  });

  const categoryAttrsOnly: Record<string, string> = {};
  const customAttrs: { key: string; value: string }[] = [];
  type AttrItem = { name: string; value: string };
  let attrsToProcess: AttrItem[] = [];

  if (product.attributes) {
    if (Array.isArray(product.attributes)) {
      attrsToProcess = product.attributes as AttrItem[];
    } else {
      const attrsObj = product.attributes as Record<string, string>;
      attrsToProcess = Object.entries(attrsObj).map(([key, value]) => ({
        name: key,
        value: String(value),
      }));
    }
  }

  attrsToProcess.forEach(({ name, value }) => {
    if (categoryAttrNames.includes(name)) {
      const slug = nameToSlugMap[name];
      if (slug) categoryAttrsOnly[slug] = value;
    } else if (categoryAttrSlugs.includes(name)) {
      categoryAttrsOnly[name] = value;
    } else {
      customAttrs.push({ key: name, value });
    }
  });

  if (product.manufacturer?.name) {
    categoryAttrsOnly[CATEGORY_ATTR_SLUG_MANUFACTURER] = product.manufacturer.name;
  }
  if (product.coatingMaterial?.name) {
    categoryAttrsOnly[CATEGORY_ATTR_SLUG_COATING_MATERIAL] = product.coatingMaterial.name;
  }
  if (product.canvasType?.name) {
    categoryAttrsOnly[CATEGORY_ATTR_SLUG_CANVAS_TYPE] = product.canvasType.name;
  }
  if (product.doorThickness?.name) {
    categoryAttrsOnly[CATEGORY_ATTR_SLUG_DOOR_THICKNESS] = product.doorThickness.name;
  }
  if (product.weatherstrip?.name) {
    categoryAttrsOnly[CATEGORY_ATTR_SLUG_WEATHERSTRIP] = product.weatherstrip.name;
  }

  const mainSupplier = product.suppliers?.find((ps) => ps.isMainSupplier);

  return {
    formData: {
      name: `${product.name || ''} (копия)`.trim(),
      slug: '',
      sku: '',
      description: product.description || '',
      price: '',
      comparePrice: '',
      stock: product.stock ?? 0,
      onOrder: product.onOrder ?? false,
      categoryId: product.categoryId || product.category?.id || '',
      isActive: true,
      isFeatured: product.isFeatured ?? false,
      isNew: product.isNew ?? false,
      partnerId: product.partnerId || '',
      sortOrder: product.sortOrder ?? 400,
      seoTitle: product.seoTitle || '',
      seoDescription: product.seoDescription || '',
      supplierId: mainSupplier?.supplierId || '',
      supplierSku: '',
      supplierProductUrl: '',
      supplierPrice: '',
      manufacturerId: product.manufacturerId ?? '',
      coatingMaterialId: product.coatingMaterialId ?? '',
      canvasTypeId: product.canvasTypeId ?? '',
      doorThicknessId: product.doorThicknessId ?? '',
      weatherstripId: product.weatherstripId ?? '',
      videoUrl: product.videoUrl || '',
      attributes: categoryAttrsOnly,
      images: Array.isArray(product.images) ? [...product.images] : [],
      sizes: Array.isArray(product.sizes) ? [...product.sizes] : [],
      openingSide: Array.isArray(product.openingSide) ? [...product.openingSide] : [],
      catalogBadgeIds: (product.cardBadgeSelections ?? [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((s) => s.badgeId),
    },
    categoryAttributes,
    customAttributes: customAttrs,
    componentsToCopy: mapRawComponentsToCopyPayload(rawComponents ?? []),
  };
}
