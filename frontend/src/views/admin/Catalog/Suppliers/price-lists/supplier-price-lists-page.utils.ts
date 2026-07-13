import type { PriceListDiffStatus } from '@/shared/api/admin-supplier-price-lists';

export function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('ru-RU')} ₽`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString('ru-RU');
}

export function statusLabel(status: PriceListDiffStatus) {
  switch (status) {
    case 'changed':
      return 'Изменилась';
    case 'added':
      return 'Новая';
    case 'removed':
      return 'Удалена';
    default:
      return 'Без изменений';
  }
}
