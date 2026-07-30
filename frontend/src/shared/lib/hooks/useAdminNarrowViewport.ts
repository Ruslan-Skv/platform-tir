'use client';

import { useSyncExternalStore } from 'react';

/** Совпадает с мобильными брейкпоинтами списков admin (договоры, замеры, заказчики). */
export const ADMIN_NARROW_VIEWPORT_MEDIA = '(max-width: 900px)';

/** Фиксированный лимит строк на узком экране, пока скрыт селект «N на странице». */
export const ADMIN_MOBILE_PAGE_LIMIT = 20;

function subscribeAdminNarrowViewport(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia(ADMIN_NARROW_VIEWPORT_MEDIA);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getAdminNarrowViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(ADMIN_NARROW_VIEWPORT_MEDIA).matches;
}

export function useAdminNarrowViewport(): boolean {
  return useSyncExternalStore(subscribeAdminNarrowViewport, getAdminNarrowViewport, () => false);
}
