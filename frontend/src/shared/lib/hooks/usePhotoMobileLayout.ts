import { useSyncExternalStore } from 'react';

/** Совпадает с breakpoints в `PhotoPage.module.css` (768px). */
const PHOTO_MOBILE_MQ = '(max-width: 768px)';

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(PHOTO_MOBILE_MQ);
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(PHOTO_MOBILE_MQ).matches;
}

/** SSR и первый кадр: считаем десктоп, затем подстраиваемся под ширину окна. */
function getServerSnapshot() {
  return false;
}

/**
 * Узкий экран для раздела «Наши работы» (фото): телефон и узкий планшет.
 */
export function usePhotoMobileLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
