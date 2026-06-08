import type { MobileCatalogColumns } from '@/shared/lib/mobile-catalog-columns';
import { MOBILE_CATALOG_COLUMNS_STORAGE_KEY } from '@/shared/lib/mobile-catalog-columns';

/** Инлайн-скрипт в <head>: тема + колонки каталога до первого кадра (как для data-theme). */
export function buildSiteBootstrapScript(
  serverDefaultMobileCatalogColumns: MobileCatalogColumns
): string {
  const serverDefault = serverDefaultMobileCatalogColumns === 2 ? 2 : 1;
  return `(function(){var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');var k=${JSON.stringify(MOBILE_CATALOG_COLUMNS_STORAGE_KEY)};var v=localStorage.getItem(k);var cols=v==='1'?1:v==='2'?2:${serverDefault};if(cols===2){document.documentElement.setAttribute('data-mobile-catalog-columns','2');}else{document.documentElement.removeAttribute('data-mobile-catalog-columns');}})();`;
}
