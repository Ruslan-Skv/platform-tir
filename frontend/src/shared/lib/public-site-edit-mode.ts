export const PUBLIC_SITE_EDIT_MODE_STORAGE_KEY = 'tir_public_site_edit_mode';

export const PUBLIC_SITE_EDIT_MODE_EVENT = 'public-site-edit-mode';

export function getPublicSiteEditMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PUBLIC_SITE_EDIT_MODE_STORAGE_KEY) === '1';
}

export function setPublicSiteEditMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PUBLIC_SITE_EDIT_MODE_STORAGE_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new Event(PUBLIC_SITE_EDIT_MODE_EVENT));
}
