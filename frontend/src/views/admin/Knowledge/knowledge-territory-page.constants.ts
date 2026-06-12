import type { TypeFilterOption } from './knowledge-territory-page.types';

export const TYPE_FILTERS: readonly TypeFilterOption[] = [
  { value: '', label: 'Все типы' },
  { value: 'VIDEO', label: 'Видео' },
  { value: 'ARTICLE', label: 'Статьи' },
  { value: 'LINK', label: 'Ссылки' },
];

export const MATERIALS_PAGE_LIMIT = 24;
