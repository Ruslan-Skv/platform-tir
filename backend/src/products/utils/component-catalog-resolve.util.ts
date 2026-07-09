import { ComponentCatalogItem, ProductComponent } from '@prisma/client';

export type CatalogItemWithKind = ComponentCatalogItem & {
  kindRef: {
    id: string;
    code: string;
    name: string;
    kitQuantity: number | null;
    quantityStep: number;
  };
};

export type ResolvedProductComponent = {
  id: string;
  productId: string;
  catalogItemId: string | null;
  kindId: string | null;
  kind: string;
  kindName: string;
  name: string;
  type: string;
  size: string | null;
  color: string | null;
  material: string | null;
  price: string;
  image: string | null;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  kitQuantity: number | null;
  quantityStep: number;
  createdAt: Date;
  updatedAt: Date;
  isFromCatalog: boolean;
};

export type ProductComponentWithCatalog = ProductComponent & {
  catalogItem?:
    | (ComponentCatalogItem & {
        kindRef?: {
          id: string;
          code: string;
          name: string;
          kitQuantity: number | null;
          quantityStep: number;
        };
      })
    | null;
};

export type ComponentKindSettingValues = {
  kitQuantity: number | null;
  quantityStep: number;
};

/** Ключ — code вида, напр. STOIKA_KOROBKI */
export type ComponentKindSettingsMap = Record<string, ComponentKindSettingValues>;

export function kitQuantityForKind(
  code: string,
  settings?: ComponentKindSettingsMap,
): number | null {
  if (settings && code in settings) {
    return settings[code]?.kitQuantity ?? null;
  }
  return defaultKitQuantity(code);
}

export function quantityStepForKind(code: string, settings?: ComponentKindSettingsMap): number {
  const fromSettings = settings?.[code]?.quantityStep;
  if (fromSettings !== undefined) return fromSettings;
  return defaultQuantityStep(code);
}

export function inferComponentKindCode(name: string, type: string): string {
  const text = `${name} ${type}`.toLowerCase();
  if (/стойк/.test(text) && /коробк/.test(text)) return 'STOIKA_KOROBKI';
  if (/наличник/.test(text)) return 'NALICHNIK';
  if (/добор/.test(text)) return 'DOBOR';
  if (/притворн/.test(text)) return 'PRITVORNAYA_PLANKA';
  if (/коробк/.test(text)) return 'KOROBKA';
  return 'OTHER';
}

/** @deprecated use inferComponentKindCode */
export const inferComponentKind = inferComponentKindCode;

export function defaultKitQuantity(code: string): number | null {
  if (code === 'STOIKA_KOROBKI') return 2.5;
  if (code === 'NALICHNIK') return 5;
  return null;
}

export function defaultQuantityStep(code: string): number {
  if (code === 'STOIKA_KOROBKI') return 0.5;
  return 1;
}

export function formatComponentType(size: string | null | undefined, legacyType?: string): string {
  const s = (size ?? '').trim();
  if (s) return s;
  return (legacyType ?? '').trim();
}

export function buildComponentLabel(parts: {
  name: string;
  size?: string | null;
  color?: string | null;
  material?: string | null;
}): string {
  return [parts.name, parts.size, parts.color, parts.material].filter(Boolean).join(', ');
}

export function resolveProductComponent(
  row: ProductComponentWithCatalog,
  settings?: ComponentKindSettingsMap,
): ResolvedProductComponent {
  const catalog = row.catalogItem;
  if (catalog?.kindRef) {
    const size = catalog.size;
    const code = catalog.kindRef.code;
    return {
      id: row.id,
      productId: row.productId,
      catalogItemId: catalog.id,
      kindId: catalog.kindRef.id,
      kind: code,
      kindName: catalog.kindRef.name,
      name: catalog.name,
      type: formatComponentType(size, row.type),
      size,
      color: catalog.color,
      material: catalog.material,
      price: catalog.price.toString(),
      image: catalog.image ?? row.image,
      stock: catalog.stock,
      isActive: row.isActive && catalog.isActive,
      sortOrder: row.sortOrder,
      kitQuantity: kitQuantityForKind(code, settings),
      quantityStep: quantityStepForKind(code, settings),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isFromCatalog: true,
    };
  }

  const code = inferComponentKindCode(row.name, row.type);
  return {
    id: row.id,
    productId: row.productId,
    catalogItemId: catalog?.id ?? null,
    kindId: catalog?.kindRef?.id ?? null,
    kind: code,
    kindName: catalog?.kindRef?.name ?? row.name,
    name: row.name,
    type: row.type,
    size: row.type || null,
    color: null,
    material: null,
    price: row.price.toString(),
    image: row.image,
    stock: row.stock,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    kitQuantity: kitQuantityForKind(code, settings),
    quantityStep: quantityStepForKind(code, settings),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isFromCatalog: false,
  };
}

export function resolveProductComponents(
  rows: ProductComponentWithCatalog[],
  settings?: ComponentKindSettingsMap,
): ResolvedProductComponent[] {
  return rows.map((row) => resolveProductComponent(row, settings));
}
