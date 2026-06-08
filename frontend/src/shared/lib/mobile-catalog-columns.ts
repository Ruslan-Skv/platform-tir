export const MOBILE_CATALOG_COLUMNS_STORAGE_KEY = 'mobile_catalog_columns';

export type MobileCatalogColumns = 1 | 2;

export function isMobileCatalogColumns(value: unknown): value is MobileCatalogColumns {
  return value === 1 || value === 2;
}

export function readStoredMobileCatalogColumns(): MobileCatalogColumns | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MOBILE_CATALOG_COLUMNS_STORAGE_KEY);
    if (raw === '1') return 1;
    if (raw === '2') return 2;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredMobileCatalogColumns(columns: MobileCatalogColumns): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MOBILE_CATALOG_COLUMNS_STORAGE_KEY, String(columns));
  } catch {
    /* ignore */
  }
}

export function applyMobileCatalogColumnsToDocument(columns: MobileCatalogColumns): void {
  if (typeof document === 'undefined') return;
  if (columns === 2) {
    document.documentElement.setAttribute('data-mobile-catalog-columns', '2');
  } else {
    document.documentElement.removeAttribute('data-mobile-catalog-columns');
  }
}

export function readMobileCatalogColumnsFromDocument(): MobileCatalogColumns | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement.getAttribute('data-mobile-catalog-columns') === '2' ? 2 : null;
}
