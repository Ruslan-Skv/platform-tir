import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type MaxidoorsCatalogKey =
  | 'handles'
  | 'cylinders'
  | 'thumbturns'
  | 'limiters'
  | 'bolts'
  | 'plates'
  | 'locks'
  | 'closers'
  | 'rigels'
  | 'sliding'
  | 'hinges'
  | 'plateHandles'
  | 'misc'
  | 'apartmentDoors'
  | 'ekoshpon'
  | 'pvh'
  | 'vfdEmalex';

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
  {
    key: 'limiters',
    label: 'Ограничители',
    categoryNames: ['ограничители (м)', 'ограничители'],
    confirmMessage:
      'Будут созданы товары из раздела «Ограничители» на maxi-doors.ru (~31 шт.) в категорию «Ограничители (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'bolts',
    label: 'Задвижки и засовы',
    categoryNames: ['задвижки и засовы (м)', 'задвижки и засовы'],
    confirmMessage:
      'Будут созданы товары из раздела «Задвижки и засовы» на maxi-doors.ru (~14 шт.) в категорию «Задвижки и засовы (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'plates',
    label: 'Накладки на цилиндр',
    categoryNames: ['накладки на цилиндр (м)', 'накладки на цилиндр'],
    confirmMessage:
      'Будут созданы товары из раздела «Накладки на цилиндр» на maxi-doors.ru (~49 шт.) в категорию «Накладки на цилиндр (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'locks',
    label: 'Замки',
    categoryNames: ['замки (м)', 'замки'],
    confirmMessage:
      'Будут созданы товары из раздела «Замки» на maxi-doors.ru (~339 шт.) в категорию «Замки (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'closers',
    label: 'Доводчики',
    categoryNames: ['доводчики (м)', 'доводчики'],
    confirmMessage:
      'Будут созданы товары из раздела «Доводчики» на maxi-doors.ru (~29 шт.) в категорию «Доводчики (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'rigels',
    label: 'Ригели',
    categoryNames: ['ригели (м)', 'ригели'],
    confirmMessage:
      'Будут созданы товары из раздела «Ригели» на maxi-doors.ru (~5 шт.) в категорию «Ригели (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'sliding',
    label: 'Комплектующие для раздвижных дверей',
    categoryNames: [
      'комплектующие для раздвижных дверей (м)',
      'комплектующие для раздвижных дверей',
    ],
    confirmMessage:
      'Будут созданы товары из раздела «Комплектующие для раздвижных дверей» на maxi-doors.ru (~17 шт.) в категорию «Комплектующие для раздвижных дверей (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'hinges',
    label: 'Петли дверные',
    categoryNames: ['петли (м)', 'петли', 'петли дверные', 'петли дверные (м)'],
    confirmMessage:
      'Будут созданы товары из раздела «Петли дверные» на maxi-doors.ru (~59 шт.) в категорию «Петли (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'plateHandles',
    label: 'Ручки на планке',
    categoryNames: ['ручки на планке (м)', 'ручки на планке'],
    confirmMessage:
      'Будут созданы товары из раздела «Ручки на планке» на maxi-doors.ru (~48 шт.) в категорию «Ручки на планке (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'misc',
    label: 'Разное',
    categoryNames: ['разное (м)', 'разное'],
    confirmMessage:
      'Будут созданы товары из раздела «Разное» на maxi-doors.ru (~38 шт.) в категорию «Разное (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'apartmentDoors',
    label: 'Двери в квартиру',
    categoryNames: ['двери в квартиру (м)', 'двери в квартиру'],
    confirmMessage:
      'Будут созданы товары из раздела «Двери в квартиру» на maxi-doors.ru (~47 шт.) в категорию «Двери в квартиру (м)». Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'ekoshpon',
    label: 'Двери экошпон',
    categoryNames: ['двери экошпон (м)', 'двери экошпон'],
    categoryId: 'cmrt2frl10005fnhxel2vno8i',
    confirmMessage:
      'Будут созданы товары из раздела «Двери экошпон» на maxi-doors.ru (~45 шт.) в категорию «Двери экошпон (м)». Импортируется цена полотна (не комплекта); блок «Комплектующие» не переносится. Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'pvh',
    label: 'Двери ПВХ',
    categoryNames: ['двери пвх (м)', 'двери пвх'],
    categoryId: 'cmrt38k540001cqf2sww09mxw',
    confirmMessage:
      'Будут созданы товары из раздела «Двери ПВХ» на maxi-doors.ru (~31 шт.) в категорию «Двери ПВХ (м)». Импортируется цена полотна (не комплекта); блок «Комплектующие» не переносится. Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
  {
    key: 'vfdEmalex',
    label: 'Двери ВФД Эмалекс',
    categoryNames: ['двери вфд эмалекс (м)', 'двери вфд эмалекс', 'вфд эмалекс (м)'],
    categoryId: 'cmrt3yktl000b2a1dvj2gwz0u',
    confirmMessage:
      'Будут созданы товары из раздела «Двери ВФД Эмалекс» на maxi-doors.ru (~19 шт.) в категорию «Двери ВФД Эмалекс (м)». Импортируется цена полотна (не комплекта); блок «Комплектующие» не переносится. Уже импортированные пропускаются. После завершения покажется список новых и товаров, которых больше нет у поставщика.',
  },
];

/** @deprecated use MAXIDOORS_CATALOG_UI / resolveMaxidoorsCatalogForCategory */
export const MAXIDOORS_HANDLES_CATEGORY_ID = 'cmrq8cmcb00im11w2bxnf0m6i';

export type MaxidoorsImportItemRef = {
  name: string;
  url: string;
  productId?: string;
  supplierSku?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
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
  /** Пропущены: URL поставщика уже есть (в этой или другой категории) */
  skippedItems?: MaxidoorsImportItemRef[];
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
