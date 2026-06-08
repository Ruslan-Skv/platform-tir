export function formatCatalogProductPrice(price: string | number): string | null {
  const num = typeof price === 'number' ? price : Number.parseFloat(price);
  if (!Number.isFinite(num)) return null;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(num);
}
