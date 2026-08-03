import { apiFetch } from '@/shared/lib/api-fetch';
import type { SupplierPriceUpdateErrorItem } from '@/shared/lib/catalog/supplier-price-update-message';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Парсер тянет страницу поставщика до ~20с на товар — партиям нужен запас. */
export const UPDATE_SUPPLIER_PRICES_TIMEOUT_MS = 90_000;
/** Сколько товаров отправлять за один запрос (последовательно на бэке). */
export const UPDATE_SUPPLIER_PRICES_BATCH_SIZE = 2;

export interface UpdateSupplierPricesResponse {
  total: number;
  updated: number;
  changed: number;
  changedIds: string[];
  errors: SupplierPriceUpdateErrorItem[];
}

export async function fetchUpdateSupplierPrices(
  productIds: string[],
  headers?: HeadersInit,
  signal?: AbortSignal
): Promise<UpdateSupplierPricesResponse> {
  const res = await apiFetch(
    `${API_URL}/products/admin/update-supplier-prices`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...normalizeHeaders(headers),
      },
      body: JSON.stringify({ productIds }),
      signal,
    },
    UPDATE_SUPPLIER_PRICES_TIMEOUT_MS
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось обновить цены поставщика');
  }
  return res.json();
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

export function chunkIds<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function isFetchTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'TimeoutError') return true;
  return /timed out/i.test(error.message);
}
