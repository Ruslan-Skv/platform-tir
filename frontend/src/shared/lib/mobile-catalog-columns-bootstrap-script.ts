import { buildAdminSidebarBootstrapScript } from '@/shared/lib/admin-sidebar-layout';
import type { MobileCatalogColumns } from '@/shared/lib/mobile-catalog-columns';
import { MOBILE_CATALOG_COLUMNS_STORAGE_KEY } from '@/shared/lib/mobile-catalog-columns';

function buildQuizHostMatchers(): string {
  const raw =
    process.env.NEXT_PUBLIC_QUIZ_DOMAINS ||
    process.env.QUIZ_DOMAINS ||
    'mebel-na-zakaz-51.ru,remont-kvartir-51.ru';
  const domains = raw
    .split(',')
    .map((d) => d.trim().toLowerCase().split(':')[0])
    .filter(Boolean);
  if (domains.length === 0) return 'false';
  const parts = domains.map((d) => `h==='${d}'||h.endsWith('.${d}')`);
  return parts.join('||');
}

/** Инлайн-скрипт в <head>: тема + колонки каталога + ширина админ-сайдбара до первого кадра. */
export function buildSiteBootstrapScript(
  serverDefaultMobileCatalogColumns: MobileCatalogColumns
): string {
  const serverDefault = serverDefaultMobileCatalogColumns === 2 ? 2 : 1;
  const quizHostCheck = buildQuizHostMatchers();
  return `(function(){var h=location.hostname.toLowerCase();var isQuiz=${quizHostCheck};if(isQuiz){document.documentElement.setAttribute('data-theme','light');}else{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}var k=${JSON.stringify(MOBILE_CATALOG_COLUMNS_STORAGE_KEY)};var v=localStorage.getItem(k);var cols=v==='1'?1:v==='2'?2:${serverDefault};if(cols===2){document.documentElement.setAttribute('data-mobile-catalog-columns','2');}else{document.documentElement.removeAttribute('data-mobile-catalog-columns');}${buildAdminSidebarBootstrapScript()}})();`;
}
