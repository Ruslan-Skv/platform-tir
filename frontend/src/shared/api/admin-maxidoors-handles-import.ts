import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Прод-категория «Ручки (м)» под фурнитурой. */
export const MAXIDOORS_HANDLES_CATEGORY_ID = 'cmrq8cmcb00im11w2bxnf0m6i';

export type MaxidoorsHandlesImportJob = {
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

export async function startMaxidoorsHandlesImport(
  body: {
    categoryId?: string;
    supplierId?: string;
    limit?: number;
    delayMs?: number;
    skipExisting?: boolean;
  },
  headers: HeadersInit
): Promise<{ jobId: string }> {
  const res = await apiFetch(`${API_URL}/admin/catalog/products/import-maxidoors-handles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message || 'Не удалось запустить импорт ручек Максидорс'
    );
  }
  return res.json();
}

export async function fetchMaxidoorsHandlesImportJob(
  jobId: string,
  headers: HeadersInit
): Promise<MaxidoorsHandlesImportJob> {
  const res = await apiFetch(
    `${API_URL}/admin/catalog/products/import-maxidoors-handles/${jobId}`,
    {
      headers,
      cache: 'no-store',
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось получить статус импорта');
  }
  return res.json();
}

export function isMaxidoorsHandlesCategory(categoryId: string | undefined | null): boolean {
  return Boolean(categoryId && categoryId === MAXIDOORS_HANDLES_CATEGORY_ID);
}
