/** Состояние витрины: остаток на складе приоритетнее флага «под заказ». */
export type ProductAvailability = 'in_stock' | 'on_order' | 'out_of_stock';

export function getProductAvailability(
  stock: number,
  onOrder?: boolean | null
): ProductAvailability {
  if (stock > 0) return 'in_stock';
  if (onOrder) return 'on_order';
  return 'out_of_stock';
}

export const PRODUCT_AVAILABILITY_LABEL: Record<ProductAvailability, string> = {
  in_stock: 'В наличии',
  on_order: 'Под заказ',
  out_of_stock: 'Товар закончился',
};
