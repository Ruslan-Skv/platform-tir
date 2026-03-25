/**
 * Утилиты для копирования товара. Используются на сервере и клиенте.
 */

export interface ProductForCopy {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  price: string | number;
  comparePrice?: string | number | null;
  stock: number;
  categoryId?: string;
  category?: { id: string };
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  partnerId?: string | null;
  sortOrder?: number;
  images: string[];
  videoUrl?: string | null;
  weight?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  attributes?: Record<string, string> | Array<{ name: string; value: string }> | null;
  sizes?: string[];
  openingSide?: string[];
  suppliers?: Array<{
    supplierId: string;
    isMainSupplier: boolean;
    supplierPrice?: string | number;
    supplierProductUrl?: string | null;
  }>;
}

export interface CategoryAttributeForCopy {
  id: string;
  attributeId: string;
  isRequired: boolean;
  order: number;
  attribute: {
    id: string;
    name: string;
    slug: string;
    type?: string;
    unit?: string;
    values?: Array<{ id: string; value: string }>;
  };
}

/** Поля для POST /product-components/product/:newProductId при копировании товара */
export interface CopyProductComponentPayload {
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
    let price: number;
    if (typeof priceRaw === 'number') {
      price = priceRaw;
    } else if (typeof priceRaw === 'string') {
      price = parseFloat(priceRaw.replace(',', '.'));
    } else {
      continue;
    }
    if (!name || !type || !Number.isFinite(price) || price < 0) continue;
    const image =
      typeof o.image === 'string' && o.image.trim().length > 0 ? o.image.trim() : undefined;
    const stock = typeof o.stock === 'number' && o.stock >= 0 ? o.stock : 0;
    const isActive = typeof o.isActive === 'boolean' ? o.isActive : true;
    const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
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
    categoryId: string;
    isActive: boolean;
    isFeatured: boolean;
    isNew: boolean;
    partnerId: string;
    sortOrder: number;
    seoTitle: string;
    seoDescription: string;
    supplierId: string;
    supplierProductUrl: string;
    supplierPrice: string;
    videoUrl: string;
    weight: string;
    attributes: Record<string, string>;
    images: string[];
    sizes: string[];
    openingSide: string[];
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

  const mainSupplier = product.suppliers?.find((ps) => ps.isMainSupplier);

  return {
    formData: {
      name: `${product.name || ''} (копия)`.trim(),
      slug: '',
      sku: '',
      description: product.description || '',
      price: String(product.price ?? ''),
      comparePrice: product.comparePrice ? String(product.comparePrice) : '',
      stock: product.stock ?? 0,
      categoryId: product.categoryId || product.category?.id || '',
      isActive: true,
      isFeatured: product.isFeatured ?? false,
      isNew: product.isNew ?? false,
      partnerId: product.partnerId || '',
      sortOrder: product.sortOrder ?? 400,
      seoTitle: product.seoTitle || '',
      seoDescription: product.seoDescription || '',
      supplierId: mainSupplier?.supplierId || '',
      supplierProductUrl: mainSupplier?.supplierProductUrl || '',
      supplierPrice: mainSupplier?.supplierPrice ? String(mainSupplier.supplierPrice) : '',
      videoUrl: product.videoUrl || '',
      weight: product.weight != null ? String(product.weight) : '',
      attributes: categoryAttrsOnly,
      images: Array.isArray(product.images) ? [...product.images] : [],
      sizes: Array.isArray(product.sizes) ? [...product.sizes] : [],
      openingSide: Array.isArray(product.openingSide) ? [...product.openingSide] : [],
    },
    categoryAttributes,
    customAttributes: customAttrs,
    componentsToCopy: mapRawComponentsToCopyPayload(rawComponents ?? []),
  };
}
