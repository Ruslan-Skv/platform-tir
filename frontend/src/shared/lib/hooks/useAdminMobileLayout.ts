import { useSyncExternalStore } from 'react';

/** Совпадает с `@media (max-width: 1024px)` в AdminHeader.module.css, AdminSidebar.module.css
 * и с `matchMedia` в AdminLayoutClient / AdminSidebar. */
const ADMIN_MOBILE_LAYOUT_MQ = '(max-width: 1024px)';

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(ADMIN_MOBILE_LAYOUT_MQ);
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(ADMIN_MOBILE_LAYOUT_MQ).matches;
}

/** SSR и первый кадр: считаем десктоп, затем подстраиваемся под ширину окна. */
function getServerSnapshot() {
  return false;
}

/**
 * Мобильная вёрстка админки: в шапке кнопка меню вместо сайдбара.
 */
export function useAdminMobileLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
