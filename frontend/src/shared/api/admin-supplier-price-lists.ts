import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Загрузка и разбор полного прайса (6 категорий) может занимать несколько минут. */
export const PRICE_LIST_UPLOAD_TIMEOUT_MS = 300_000;

export type SupplierPriceListCategory =
  | 'TRIM'
  | 'INTERIOR_DOOR'
  | 'STEEL_DOOR'
  | 'HARDWARE'
  | 'ARCH'
  | 'ACCORDION';

export const PRICE_LIST_CATEGORIES: SupplierPriceListCategory[] = [
  'TRIM',
  'INTERIOR_DOOR',
  'STEEL_DOOR',
  'HARDWARE',
  'ARCH',
  'ACCORDION',
];

export const PRICE_LIST_CATEGORY_LABELS: Record<SupplierPriceListCategory, string> = {
  TRIM: 'Погонаж',
  INTERIOR_DOOR: 'Межкомнатные двери',
  STEEL_DOOR: 'Стальные двери',
  HARDWARE: 'Фурнитура',
  ARCH: 'Арки',
  ACCORDION: 'Гармошки',
};

export const PRICE_LIST_UPLOAD_HINT =
  'Полный прайс Стройком (.xls / .xlsx) — разбираются все категории. Большой файл может загружаться 1–3 минуты, не закрывайте страницу.';

export const PRICE_LIST_CATEGORY_HINTS: Record<SupplierPriceListCategory, string> = {
  TRIM: 'Вкладка «Межкомнатные двери с фото», только погонаж, колонка РРЦ',
  INTERIOR_DOOR: 'Вкладка «Межкомнатные двери с фото», модели дверей, колонка РРЦ',
  STEEL_DOOR: 'Вкладка «Стальные двери с фото», колонка РРЦ',
  HARDWARE: 'Вкладка «Фурнитура с фото», колонка РРЦ',
  ARCH: 'Вкладка «Арки с фото», колонка РРЦ',
  ACCORDION: 'Вкладка «Гармошки с фото», колонка РРЦ',
};

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return headers;
}

export type SupplierPriceListSnapshot = {
  id: string;
  category: SupplierPriceListCategory;
  fileName: string;
  priceListDate: string | null;
  parserCode: string;
  sheetName: string;
  rowCount: number;
  createdAt: string;
  uploadedBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
};

export type PriceListDiffStatus = 'unchanged' | 'changed' | 'added' | 'removed';

export type PriceListDiffRow = {
  status: PriceListDiffStatus;
  rowKey: string;
  blockTitle: string;
  color: string;
  itemName: string;
  size: string | null;
  material: string | null;
  variantNote: string | null;
  previousPrice: number | null;
  currentPrice: number | null;
  delta: number | null;
  catalogItemId: string | null;
  catalogItemLabel: string | null;
};

export type PriceListCompareResponse = {
  currentSnapshot: {
    id: string;
    category: SupplierPriceListCategory;
    fileName: string;
    priceListDate: string | null;
    rowCount: number;
    createdAt: string;
  };
  previousSnapshot: {
    id: string;
    category: SupplierPriceListCategory;
    fileName: string;
    priceListDate: string | null;
    rowCount: number;
    createdAt: string;
  } | null;
  summary: {
    unchanged: number;
    changed: number;
    added: number;
    removed: number;
  };
  rows: PriceListDiffRow[];
};

async function parseError(res: Response, fallback: string) {
  const err = await res.json().catch(() => ({}));
  throw new Error((err as { message?: string }).message || fallback);
}

export async function fetchSupplierPriceListSnapshots(
  supplierId: string,
  category?: SupplierPriceListCategory
): Promise<SupplierPriceListSnapshot[]> {
  const params = category ? `?category=${category}` : '';
  const res = await apiFetch(
    `${API_URL}/admin/catalog/suppliers/${supplierId}/price-lists${params}`,
    {
      headers: getAdminAuthHeaders(),
      cache: 'no-store',
    }
  );
  if (!res.ok) await parseError(res, 'Не удалось загрузить снимки прайса');
  return res.json();
}

export type SupplierPriceListUploadAllResponse = {
  fileName: string;
  snapshots: SupplierPriceListSnapshot[];
  skipped: Array<{ category: SupplierPriceListCategory; reason: string }>;
};

export async function uploadSupplierPriceListAll(
  supplierId: string,
  file: File
): Promise<SupplierPriceListUploadAllResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(
    `${API_URL}/admin/catalog/suppliers/${supplierId}/price-lists/upload-all`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: formData,
    },
    PRICE_LIST_UPLOAD_TIMEOUT_MS
  );
  if (!res.ok) await parseError(res, 'Ошибка загрузки прайс-листа');
  return res.json();
}

export async function uploadSupplierPriceList(
  supplierId: string,
  file: File,
  category: SupplierPriceListCategory
): Promise<SupplierPriceListSnapshot> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  const res = await apiFetch(
    `${API_URL}/admin/catalog/suppliers/${supplierId}/price-lists/upload`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: formData,
    }
  );
  if (!res.ok) await parseError(res, 'Ошибка загрузки прайс-листа');
  return res.json();
}

export async function compareSupplierPriceLists(
  supplierId: string,
  currentId: string,
  category?: SupplierPriceListCategory,
  previousId?: string
): Promise<PriceListCompareResponse> {
  const params = new URLSearchParams({ currentId });
  if (previousId) params.set('previousId', previousId);
  if (category) params.set('category', category);
  const res = await apiFetch(
    `${API_URL}/admin/catalog/suppliers/${supplierId}/price-lists/compare?${params}`,
    {
      headers: getAdminAuthHeaders(),
      cache: 'no-store',
    }
  );
  if (!res.ok) await parseError(res, 'Ошибка сравнения прайс-листов');
  return res.json();
}

export async function autoMapSupplierPriceListRows(
  supplierId: string,
  snapshotId?: string,
  category: SupplierPriceListCategory = 'TRIM'
): Promise<{ mapped: number; skipped: number; total: number }> {
  const res = await apiFetch(
    `${API_URL}/admin/catalog/suppliers/${supplierId}/price-lists/auto-map`,
    {
      method: 'POST',
      headers: { ...getAdminAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshotId, category }),
    }
  );
  if (!res.ok) await parseError(res, 'Ошибка автопривязки');
  return res.json();
}

export async function applySupplierPriceListChanges(
  supplierId: string,
  body: {
    currentSnapshotId: string;
    previousSnapshotId?: string;
    rowKeys?: string[];
    category?: SupplierPriceListCategory;
  }
): Promise<{
  updated: number;
  items: Array<{ catalogItemId: string; oldPrice: number; newPrice: number }>;
}> {
  const res = await apiFetch(`${API_URL}/admin/catalog/suppliers/${supplierId}/price-lists/apply`, {
    method: 'POST',
    headers: { ...getAdminAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseError(res, 'Ошибка применения цен');
  return res.json();
}
