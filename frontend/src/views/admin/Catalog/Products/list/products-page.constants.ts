import type { AdminProductListItem } from '@/shared/api/admin-products-list';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
export const PRODUCTS_PAGE_LIMIT_STORAGE_KEY = 'admin_products_page_limit';
export const PRODUCTS_SEARCH_HISTORY_STORAGE_KEY = 'admin_products_search_history';
export const MAX_PRODUCTS_SEARCH_HISTORY = 10;
/** Совпадает с backend MAX_LIST_LIMIT — UI не должен предлагать больше. */
export const PRODUCTS_PAGE_MAX_LIMIT = 100;
export const PRODUCTS_PAGE_LIMIT_OPTIONS = [20, 50, 100] as const;

export function normalizeProductsPageLimit(value: number): number {
  if ((PRODUCTS_PAGE_LIMIT_OPTIONS as readonly number[]).includes(value)) return value;
  if (Number.isFinite(value) && value > PRODUCTS_PAGE_MAX_LIMIT) return PRODUCTS_PAGE_MAX_LIMIT;
  return 20;
}

export function readProductsSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRODUCTS_SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, MAX_PRODUCTS_SEARCH_HISTORY);
  } catch {
    return [];
  }
}

export function persistProductsSearchHistory(items: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      PRODUCTS_SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_PRODUCTS_SEARCH_HISTORY))
    );
  } catch {
    // ignore
  }
}

export function addProductsSearchHistoryEntry(query: string, current: string[]): string[] {
  const trimmed = query.trim();
  if (!trimmed) return current;
  return [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_PRODUCTS_SEARCH_HISTORY
  );
}

/** Уникальный query при каждом входе в карточку — иначе Next.js Router Cache может не перемонтировать страницу и показать старые поля */
export function hrefToProductEdit(productId: string, fromCategory: string): string {
  const base = fromCategory
    ? `/admin/catalog/products/${productId}/edit?fromCategory=${fromCategory}`
    : `/admin/catalog/products/${productId}/edit`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}v=${Date.now()}`;
}

export type Product = AdminProductListItem;

export interface ColumnConfig {
  key: string;
  title: string;
  editable: boolean;
  type: 'text' | 'number' | 'boolean' | 'currency' | 'date';
}

export const formatDate = (value: unknown): string => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : null;
  if (!date || isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: 'price', title: 'Цена', editable: true, type: 'currency' },
  { key: 'comparePrice', title: 'Старая цена', editable: true, type: 'currency' },
  { key: 'supplierPrice', title: 'Цена поставщика', editable: false, type: 'currency' },
  { key: 'stock', title: 'Остаток', editable: true, type: 'number' },
  { key: 'sortOrder', title: 'Сортировка', editable: true, type: 'number' },
  { key: 'isActive', title: 'Активен', editable: true, type: 'boolean' },
  { key: 'isFeatured', title: 'Хит', editable: true, type: 'boolean' },
  { key: 'isNew', title: 'Новинка', editable: true, type: 'boolean' },
  { key: 'isPartnerProduct', title: 'Товар партнёра', editable: true, type: 'boolean' },
  { key: 'supplier', title: 'Поставщик', editable: true, type: 'text' },
  { key: 'supplierSku', title: 'Арт. поставщика', editable: false, type: 'text' },
  { key: 'updatedAt', title: 'Дата обновления', editable: false, type: 'date' },
  { key: 'createdBy', title: 'Автор', editable: false, type: 'text' },
];

export type EditableValue = string | number | boolean | null;
export type ProductEdits = Partial<Record<string, EditableValue>>;

export interface CategoriesResponse {
  id: string;
  name: string;
  slug: string;
  children?: CategoriesResponse[];
}
