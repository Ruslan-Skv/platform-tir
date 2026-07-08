import {
  resolveProductComponent,
  type ProductComponentWithCatalog,
} from '../products/utils/component-catalog-resolve.util';

export function resolveCartComponentPrice(component: ProductComponentWithCatalog): number {
  return parseFloat(resolveProductComponent(component).price);
}

export function resolveCartComponentLabel(component: ProductComponentWithCatalog): string {
  const resolved = resolveProductComponent(component);
  return [resolved.name, resolved.size, resolved.color, resolved.material]
    .filter(Boolean)
    .join(', ');
}

export function mapCartComponent(
  component: ProductComponentWithCatalog & {
    product?: { id: string; name: string; slug: string };
  },
) {
  const resolved = resolveProductComponent(component);
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
