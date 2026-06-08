import { cache } from 'react';

import type { CatalogSettings } from '@/shared/api/catalog-settings';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

/** SSR: настройки каталога (число колонок на мобильном по умолчанию) */
export const getCatalogSettingsCached = cache(async (): Promise<CatalogSettings> => {
  const base = getServerApiBaseUrl();
  const res = await fetch(`${base}/catalog/settings`, {
    next: { revalidate: 300, tags: ['catalog-settings'] },
  });
  if (!res.ok) {
    throw new Error('Не удалось загрузить настройки каталога');
  }
  return res.json() as Promise<CatalogSettings>;
});
