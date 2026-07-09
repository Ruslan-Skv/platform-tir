import {
  resolveProductComponent,
  type ProductComponentWithCatalog,
  type ComponentKindSettingsMap,
} from '../products/utils/component-catalog-resolve.util';

export function resolveCartComponentPrice(
  component: ProductComponentWithCatalog,
  settings?: ComponentKindSettingsMap,
): number {
  return parseFloat(resolveProductComponent(component, settings).price);
}

export function resolveCartComponentLabel(
  component: ProductComponentWithCatalog,
  settings?: ComponentKindSettingsMap,
): string {
  const resolved = resolveProductComponent(component, settings);
  return [resolved.name, resolved.size, resolved.color, resolved.material]
    .filter(Boolean)
    .join(', ');
}

export function mapCartComponent(
  component: ProductComponentWithCatalog & {
    product?: { id: string; name: string; slug: string };
  },
  settings?: ComponentKindSettingsMap,
) {
  const resolved = resolveProductComponent(component, settings);
  return {
    id: resolved.id,
    productId: resolved.productId,
    catalogItemId: resolved.catalogItemId,
    kind: resolved.kind,
    name: resolved.name,
    type: resolved.type,
    size: resolved.size,
    color: resolved.color,
    material: resolved.material,
    price: resolved.price,
    image: resolved.image,
    stock: resolved.stock,
    isActive: resolved.isActive,
    sortOrder: resolved.sortOrder,
    kitQuantity: resolved.kitQuantity,
    quantityStep: resolved.quantityStep,
    isFromCatalog: resolved.isFromCatalog,
    product: component.product,
  };
}
