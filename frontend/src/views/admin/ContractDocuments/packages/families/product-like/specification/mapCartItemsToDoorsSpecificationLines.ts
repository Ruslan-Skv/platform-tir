import type { CartItem } from '@/shared/api/cart';

import {
  type DoorsSpecificationLine,
  doorsSpecificationLineHasContent,
  ensureAtLeastOneDoorsSpecificationLine,
  formatDoorsSpecificationLineTotal,
  formatDoorsSpecificationMoney,
  newDoorsSpecificationLine,
} from './doorsSpecification';

export type DoorsSpecificationCartImportMode = 'replace' | 'append';

export type MapCartItemsToDoorsSpecificationResult = {
  lines: DoorsSpecificationLine[];
  importedCount: number;
  skippedCount: number;
};

const COLOR_ATTRIBUTE_SLUGS = new Set(['coating-material', 'color', 'tsvet', 'cvet']);

function normalizeAttrSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/_/g, '-');
}

/** Prisma Decimal и JSON часто отдают цену строкой. */
export function parseCartMoney(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
    if (!normalized) return 0;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value != null && typeof value === 'object' && 'toString' in value) {
    return parseCartMoney(String(value));
  }
  return 0;
}

function readAttributeValue(attributes: unknown, slug: string): string {
  if (!attributes) return '';
  const target = normalizeAttrSlug(slug);

  if (Array.isArray(attributes)) {
    for (const item of attributes) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as { name?: string; value?: string; slug?: string };
      const entrySlug = normalizeAttrSlug(entry.slug ?? entry.name ?? '');
      const name = (entry.name ?? '').trim().toLowerCase();
      const value = (entry.value ?? '').trim();
      if (!value) continue;
      if (entrySlug === target) return value;
      if (name.includes('цвет') || name.includes('color')) return value;
    }
    return '';
  }

  if (typeof attributes === 'object') {
    for (const [key, raw] of Object.entries(attributes as Record<string, unknown>)) {
      if (normalizeAttrSlug(key) !== target) continue;
      const value = String(raw ?? '').trim();
      if (value) return value;
    }
  }

  return '';
}

export function resolveCartProductColor(item: CartItem): string {
  const variantColor = item.cardVariant?.color?.trim();
  if (variantColor) return variantColor;

  const product = item.product;
  if (!product) return '';

  const coatingMaterialName = product.coatingMaterial?.name?.trim();
  if (coatingMaterialName) return coatingMaterialName;

  for (const slug of COLOR_ATTRIBUTE_SLUGS) {
    const value = readAttributeValue(product.attributes, slug);
    if (value) return value;
  }

  return '';
}

export function resolveCartProductUnitPrice(item: CartItem): number {
  const product = item.product;
  if (!product) return 0;

  const variantPrice = item.cardVariant ? parseCartMoney(item.cardVariant.price) : 0;
  if (variantPrice > 0) return variantPrice;

  return parseCartMoney(product.price);
}

function formatQuantity(value: number): string {
  const qty = Math.max(1, Math.round(Number(value)));
  return String(qty);
}

function formatUnitPrice(value: number): string {
  return formatDoorsSpecificationMoney(value);
}

function buildLineName(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' · ');
}

export function isCartItemRelevantForDoorsSpecification(item: CartItem): boolean {
  if (item.componentId && item.component) return true;
  return Boolean(item.productId && item.product);
}

function mapProductCartItemToLine(item: CartItem): DoorsSpecificationLine | null {
  const product = item.product;
  if (!product) return null;

  const variant = item.cardVariant ?? null;
  const unitPrice = resolveCartProductUnitPrice(item);
  const name = buildLineName([
    product.name,
    variant?.name && variant.name !== product.name ? variant.name : '',
  ]);
  const line: DoorsSpecificationLine = {
    ...newDoorsSpecificationLine(),
    name,
    size: (item.size ?? variant?.size ?? '').trim(),
    color: resolveCartProductColor(item),
    openingSide: (item.openingSide ?? '').trim(),
    quantity: formatQuantity(item.quantity),
    unitPrice: formatUnitPrice(unitPrice),
    lineTotal: '',
  };
  return { ...line, lineTotal: formatDoorsSpecificationLineTotal(line) };
}

function mapComponentCartItemToLine(item: CartItem): DoorsSpecificationLine | null {
  const component = item.component;
  if (!component) return null;

  const name = buildLineName([
    component.name,
    component.type && component.type !== component.name ? component.type : '',
    component.product?.name ? `к ${component.product.name}` : '',
  ]);
  const line: DoorsSpecificationLine = {
    ...newDoorsSpecificationLine(),
    name,
    size: '',
    color: '',
    openingSide: '',
    quantity: formatQuantity(item.quantity),
    unitPrice: formatUnitPrice(parseCartMoney(component.price)),
    lineTotal: '',
  };
  return { ...line, lineTotal: formatDoorsSpecificationLineTotal(line) };
}

export function mapCartItemToDoorsSpecificationLine(item: CartItem): DoorsSpecificationLine | null {
  if (!isCartItemRelevantForDoorsSpecification(item)) return null;
  if (item.componentId && item.component) return mapComponentCartItemToLine(item);
  if (item.productId && item.product) return mapProductCartItemToLine(item);
  return null;
}

export function mapCartItemsToDoorsSpecificationLines(
  items: CartItem[]
): MapCartItemsToDoorsSpecificationResult {
  const lines: DoorsSpecificationLine[] = [];
  let skippedCount = 0;

  for (const item of items) {
    if (!isCartItemRelevantForDoorsSpecification(item)) {
      skippedCount += 1;
      continue;
    }
    const line = mapCartItemToDoorsSpecificationLine(item);
    if (!line) {
      skippedCount += 1;
      continue;
    }
    lines.push(line);
  }

  return { lines, importedCount: lines.length, skippedCount };
}

export function mergeDoorsSpecificationLines(
  existing: DoorsSpecificationLine[],
  imported: DoorsSpecificationLine[],
  mode: DoorsSpecificationCartImportMode
): DoorsSpecificationLine[] {
  if (imported.length === 0) {
    return ensureAtLeastOneDoorsSpecificationLine(existing);
  }
  if (mode === 'replace') {
    return imported;
  }
  const kept = existing.filter(doorsSpecificationLineHasContent);
  return ensureAtLeastOneDoorsSpecificationLine([...kept, ...imported]);
}
