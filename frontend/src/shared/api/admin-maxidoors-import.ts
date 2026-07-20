import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type MaxidoorsCatalogKey = 'handles' | 'cylinders' | 'thumbturns';

export type MaxidoorsCatalogUi = {
  key: MaxidoorsCatalogKey;
  label: string;
  /** Имена категорий (lower-case), в которых показывать кнопку импорта */
  categoryNames: string[];
  /** Прод-ID, если известен (локально может отличаться — матчим ещё и по имени) */
  categoryId?: string;
  confirmMessage: string;
};

/** Каталоги MaxiDoors: кнопка импорта показывается в соответствующей категории. */
export const MAXIDOORS_CATALOG_UI: MaxidoorsCatalogUi[] = [
  {
    key: 'handles',
    label: 'Ручки межкомнатные',
    categoryNames: ['ручки (м)'],
    categoryId: 'cmrq8cmcb00im11w2bxnf0m6i',
    confirmMessage:
      'Будут созданы товары из раздела «Ручки межкомнатные» на maxi-doors.ru в категорию «Ручки (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'cylinders',
    label: 'Цилиндры',
    categoryNames: ['цилиндры (м)'],
    confirmMessage:
      'Будут созданы товары из раздела «Цилиндры» на maxi-doors.ru (~105 шт.) в категорию «Цилиндры (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'thumbturns',
    label: 'Завертки',
    categoryNames: ['завертки', 'завертки (м)'],
    categoryId: 'cmrsug79w0009zm5mrrri3wr5',
    confirmMessage:
      'Будут созданы товары из раздела «Завертки» на maxi-doors.ru (~71 шт.) в категорию «Завертки». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
];

/** @deprecated use MAXIDOORS_CATALOG_UI / resolveMaxidoorsCatalogForCategory */
export const MAXIDOORS_HANDLES_CATEGORY_ID = 'cmrq8cmcb00im11w2bxnf0m6i';

export type MaxidoorsImportItemRef = {
  name: string;
  url: string;
  productId?: string;
  supplierSku?: string | null;
};

export type MaxidoorsImportJob = {
  id: string;
  catalog?: MaxidoorsCatalogKey | string;
  status: 'pending' | 'running' | 'done' | 'error';
  categoryId: string;
  supplierId: string | null;
  total: number;
  done: number;
  created: number;
  skipped: number;
  errors: string[];
  createdItems?: MaxidoorsImportItemRef[];
  missingItems?: MaxidoorsImportItemRef[];
  startedAt: string;
  finishedAt?: string;
  message?: string;
};

/** @deprecated alias */
export type MaxidoorsHandlesImportJob = MaxidoorsImportJob;

export function resolveMaxidoorsCatalogForCategory(
  categoryId: string | undefined | null,
  categoryName: string | undefined | null
): MaxidoorsCatalogUi | null {
  const name = categoryName?.trim().toLowerCase() || '';
  for (const catalog of MAXIDOORS_CATALOG_UI) {
    if (catalog.categoryId && categoryId && catalog.categoryId === categoryId) return catalog;
    if (name && catalog.categoryNames.includes(name)) return catalog;
  }
  return null;
}

export function isMaxidoorsHandlesCategory(categoryId: string | undefined | null): boolean {
  return Boolean(categoryId && categoryId === MAXIDOORS_HANDLES_CATEGORY_ID);
}

export async function startMaxidoorsImport(
  body: {
    catalog: MaxidoorsCatalogKey | string;
    categoryId?: string;
    supplierId?: string;
    limit?: number;
    delayMs?: number;
    skipExisting?: boolean;
  },
  headers: HeadersInit
): Promise<{ jobId: string }> {
  const res = await apiFetch(`${API_URL}/admin/catalog/products/import-maxidoors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message || 'Не удалось запустить импорт Максидорс'
    );
  }
  return res.json();
}

export async function fetchMaxidoorsImportJob(
  jobId: string,
  headers: HeadersInit
): Promise<MaxidoorsImportJob> {
  const res = await apiFetch(`${API_URL}/admin/catalog/products/import-maxidoors/${jobId}`, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось получить статус импорта');
  }
  return res.json();
}

/** @deprecated use startMaxidoorsImport({ catalog: 'handles', ... }) */
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
  return startMaxidoorsImport({ catalog: 'handles', ...body }, headers);
}

/** @deprecated use fetchMaxidoorsImportJob */
export async function fetchMaxidoorsHandlesImportJob(
  jobId: string,
  headers: HeadersInit
): Promise<MaxidoorsImportJob> {
  return fetchMaxidoorsImportJob(jobId, headers);
}
