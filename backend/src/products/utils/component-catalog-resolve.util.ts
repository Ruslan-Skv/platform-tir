import { ComponentCatalogItem, ComponentKind, ProductComponent } from '@prisma/client';

export type ProductComponentWithCatalog = ProductComponent & {
  catalogItem?: ComponentCatalogItem | null;
};

export type ResolvedProductComponent = {
  id: string;
  productId: string;
  catalogItemId: string | null;
  kind: ComponentKind;
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

export function inferComponentKind(name: string, type: string): ComponentKind {
  const text = `${name} ${type}`.toLowerCase();
  if (/стойк/.test(text) && /коробк/.test(text)) return ComponentKind.STOIKA_KOROBKI;
  if (/наличник/.test(text)) return ComponentKind.NALICHNIK;
  if (/добор/.test(text)) return ComponentKind.DOBOR;
  if (/притворн/.test(text)) return ComponentKind.PRITVORNAYA_PLANKA;
  if (/коробк/.test(text)) return ComponentKind.KOROBKA;
  return ComponentKind.OTHER;
}

export function defaultKitQuantity(kind: ComponentKind): number | null {
  if (kind === ComponentKind.STOIKA_KOROBKI) return 2.5;
  if (kind === ComponentKind.NALICHNIK) return 5;
  return null;
}

export function defaultQuantityStep(kind: ComponentKind): number {
  if (kind === ComponentKind.STOIKA_KOROBKI) return 0.5;
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
): ResolvedProductComponent {
  const catalog = row.catalogItem;
  if (catalog) {
    const size = catalog.size;
    return {
      id: row.id,
      productId: row.productId,
      catalogItemId: catalog.id,
      kind: catalog.kind,
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
      kitQuantity: catalog.kitQuantity,
      quantityStep: catalog.quantityStep,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isFromCatalog: true,
    };
  }

  const kind = inferComponentKind(row.name, row.type);
  return {
    id: row.id,
    productId: row.productId,
    catalogItemId: null,
    kind,
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
    kitQuantity: defaultKitQuantity(kind),
    quantityStep: defaultQuantityStep(kind),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isFromCatalog: false,
  };
}

export function resolveProductComponents(
  rows: ProductComponentWithCatalog[],
): ResolvedProductComponent[] {
  return rows.map(resolveProductComponent);
}
