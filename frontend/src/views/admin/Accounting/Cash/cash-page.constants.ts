/** Опции количества строк на странице кассы. */
export const CASH_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type CashPageLimit = (typeof CASH_PAGE_LIMIT_OPTIONS)[number];

/** Ключ localStorage для сохранения фильтров и настроек страницы кассы. */
export const CASH_PAGE_FILTERS_STORAGE_KEY = 'admin_cash_page_filters_v1';
