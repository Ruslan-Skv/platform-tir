import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type MaxidoorsCatalogKey = 'handles' | 'cylinders';

export type MaxidoorsCatalogUi = {
  key: MaxidoorsCatalogKey;
  label: string;
  categoryName: string;
  /** Прод-ID, если известен (локально может отличаться — матчим ещё и по имени) */
  categoryId?: string;
  confirmMessage: string;
};

/** Каталоги MaxiDoors: кнопка импорта показывается в соответствующей категории. */
export const MAXIDOORS_CATALOG_UI: MaxidoorsCatalogUi[] = [
  {
    key: 'handles',
    label: 'Ручки межкомнатные',
    categoryName: 'ручки (м)',
    categoryId: 'cmrq8cmcb00im11w2bxnf0m6i',
    confirmMessage:
      'Будут созданы товары из раздела «Ручки межкомнатные» на maxi-doors.ru в категорию «Ручки (м)»: название, цена, артикул и ссылка поставщика, описание, фото, цвет из названия, производитель, материал покрытия, SEO. Наличие — остаток 100; под заказ — остаток 0. Уже импортированные (по ссылке на карточку) будут пропущены.',
  },
  {
    key: 'cylinders',
    label: 'Цилиндры',
    categoryName: 'цилиндры (м)',
    confirmMessage:
      'Будут созданы товары из раздела «Цилиндры» на maxi-doors.ru (~105 шт.) в категорию «Цилиндры (м)»: название, цена, артикул и ссылка поставщика, описание, фото, характеристики (секретность, пины, ключи, размер, материал, класс защиты, механизм постоянного ключа), производитель, SEO. Наличие — остаток 100; под заказ — остаток 0. Уже импортированные будут пропущены.',
  },
];

/** @deprecated use MAXIDOORS_CATALOG_UI / resolveMaxidoorsCatalogForCategory */
export const MAXIDOORS_HANDLES_CATEGORY_ID = 'cmrq8cmcb00im11w2bxnf0m6i';

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
    if (name && name === catalog.categoryName) return catalog;
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
