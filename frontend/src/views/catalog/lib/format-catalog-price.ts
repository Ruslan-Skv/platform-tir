const RU_PRICE_NUMBER = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

function parseCatalogPrice(price: string | number): number | null {
  const num = typeof price === 'number' ? price : Number.parseFloat(price);
  return Number.isFinite(num) ? num : null;
}

/** Число для SSR/клиента в одном формате (без привязки к locale Node в Docker). */
export function formatCatalogPriceAmount(price: string | number): string {
  const num = parseCatalogPrice(price);
  if (num == null) return '0';
  return RU_PRICE_NUMBER.format(num);
}

/** «12 345 ₽» — как в карточке товара */
export function formatCatalogPriceWithRuble(price: string | number): string {
  return `${formatCatalogPriceAmount(price)} ₽`;
}

export function formatCatalogProductPrice(price: string | number): string | null {
  const num = parseCatalogPrice(price);
  if (num == null) return null;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(num);
}
