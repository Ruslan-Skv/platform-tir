export const PUBLIC_SITE_EDIT_MODE_STORAGE_KEY = 'tir_public_site_edit_mode';

/** Unix ms последнего взаимодействия с режимом правки публичного сайта */
export const PUBLIC_SITE_EDIT_MODE_LAST_AT_KEY = 'tir_public_site_edit_mode_last_at';

/** Автовыключение режима после простоя (мс) */
export const PUBLIC_SITE_EDIT_MODE_IDLE_MS = 30 * 60 * 1000;

export const PUBLIC_SITE_EDIT_MODE_EVENT = 'public-site-edit-mode';

export function getPublicSiteEditMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PUBLIC_SITE_EDIT_MODE_STORAGE_KEY) === '1';
}

/** Обновить время активности (пока режим включён). */
export function touchPublicSiteEditModeActivity(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(PUBLIC_SITE_EDIT_MODE_STORAGE_KEY) !== '1') return;
  localStorage.setItem(PUBLIC_SITE_EDIT_MODE_LAST_AT_KEY, String(Date.now()));
}

/**
 * Если режим включён и прошло больше {@link PUBLIC_SITE_EDIT_MODE_IDLE_MS} с последней активности —
 * выключает режим. Старые записи без таймстампа получают «отсрочку» от момента первой проверки.
 */
export function checkPublicSiteEditModeIdleAndMaybeDisable(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(PUBLIC_SITE_EDIT_MODE_STORAGE_KEY) !== '1') return;

  const raw = localStorage.getItem(PUBLIC_SITE_EDIT_MODE_LAST_AT_KEY);
  if (!raw) {
    touchPublicSiteEditModeActivity();
    return;
  }
  const last = parseInt(raw, 10);
  if (!Number.isFinite(last)) {
    touchPublicSiteEditModeActivity();
    return;
  }
  if (Date.now() - last > PUBLIC_SITE_EDIT_MODE_IDLE_MS) {
    setPublicSiteEditMode(false);
  }
}

export function setPublicSiteEditMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PUBLIC_SITE_EDIT_MODE_STORAGE_KEY, enabled ? '1' : '0');
  if (enabled) {
    localStorage.setItem(PUBLIC_SITE_EDIT_MODE_LAST_AT_KEY, String(Date.now()));
  } else {
    localStorage.removeItem(PUBLIC_SITE_EDIT_MODE_LAST_AT_KEY);
  }
  window.dispatchEvent(new Event(PUBLIC_SITE_EDIT_MODE_EVENT));
}
