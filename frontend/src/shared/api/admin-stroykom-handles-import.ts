import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Прод-категория «Ручки» под фурнитурой. */
export const STROYKOM_HANDLES_CATEGORY_ID = 'cmrkk0jq4002prjl64owdkzcl';

/** Прод-поставщик Стройком. */
export const STROYKOM_SUPPLIER_ID = 'cmmvshxbi0016phv7ufr2e0uu';

export type StroykomHandlesImportJob = {
  id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  categoryId: string;
  supplierId: string | null;
  total: number;
  done: number;
  created: number;
  skipped: number;
  errors: string[];
  startedAt: string;
  finishedAt?: string;
  message?: string;
};

export async function startStroykomHandlesImport(
  body: {
    categoryId?: string;
    supplierId?: string;
    limit?: number;
    delayMs?: number;
    skipExisting?: boolean;
  },
  headers: HeadersInit
): Promise<{ jobId: string }> {
  const res = await apiFetch(`${API_URL}/admin/catalog/products/import-stroykom-handles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message || 'Не удалось запустить импорт ручек Стройком'
    );
  }
  return res.json();
}

export async function fetchStroykomHandlesImportJob(
  jobId: string,
  headers: HeadersInit
): Promise<StroykomHandlesImportJob> {
  const res = await apiFetch(`${API_URL}/admin/catalog/products/import-stroykom-handles/${jobId}`, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось получить статус импорта');
  }
  return res.json();
}

export function isStroykomHandlesCategory(categoryId: string | undefined | null): boolean {
  return Boolean(categoryId && categoryId === STROYKOM_HANDLES_CATEGORY_ID);
}
