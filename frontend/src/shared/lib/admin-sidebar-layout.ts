/** Ключи и хелперы ширины/свёртки админ-сайдбара (localStorage + CSS vars до гидратации). */

export const ADMIN_SIDEBAR_WIDTH_STORAGE_KEY = 'admin-sidebar-width';
export const ADMIN_SIDEBAR_COLLAPSED_STORAGE_KEY = 'admin-sidebar-collapsed';

export const ADMIN_SIDEBAR_DEFAULT_WIDTH = 220;
export const ADMIN_SIDEBAR_COLLAPSED_WIDTH = 70;
export const ADMIN_SIDEBAR_MIN_WIDTH = 180;
export const ADMIN_SIDEBAR_MAX_WIDTH = 400;

export function clampAdminSidebarWidth(width: number): number {
  return Math.min(ADMIN_SIDEBAR_MAX_WIDTH, Math.max(ADMIN_SIDEBAR_MIN_WIDTH, width));
}

export function readStoredAdminSidebarWidth(): number {
  if (typeof window === 'undefined') return ADMIN_SIDEBAR_DEFAULT_WIDTH;
  try {
    const raw = localStorage.getItem(ADMIN_SIDEBAR_WIDTH_STORAGE_KEY);
    if (!raw) return ADMIN_SIDEBAR_DEFAULT_WIDTH;
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return ADMIN_SIDEBAR_DEFAULT_WIDTH;
    return clampAdminSidebarWidth(parsed);
  } catch {
    return ADMIN_SIDEBAR_DEFAULT_WIDTH;
  }
}

export function readStoredAdminSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistAdminSidebarWidth(width: number): void {
  try {
    localStorage.setItem(ADMIN_SIDEBAR_WIDTH_STORAGE_KEY, String(clampAdminSidebarWidth(width)));
  } catch {
    // ignore
  }
}

export function persistAdminSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    // ignore
  }
}

/** Инлайн-скрипт: задаёт --admin-sidebar-* до первого кадра (без прыжка ширины). */
export function buildAdminSidebarBootstrapScript(): string {
  return `try{var w=parseInt(localStorage.getItem(${JSON.stringify(ADMIN_SIDEBAR_WIDTH_STORAGE_KEY)})||'',10);if(isNaN(w)||w<${ADMIN_SIDEBAR_MIN_WIDTH}||w>${ADMIN_SIDEBAR_MAX_WIDTH})w=${ADMIN_SIDEBAR_DEFAULT_WIDTH};var c=localStorage.getItem(${JSON.stringify(ADMIN_SIDEBAR_COLLAPSED_STORAGE_KEY)})==='1';var o=c?${ADMIN_SIDEBAR_COLLAPSED_WIDTH}:w;var r=document.documentElement;r.style.setProperty('--admin-sidebar-width',w+'px');r.style.setProperty('--admin-sidebar-offset',o+'px');if(c)r.setAttribute('data-admin-sidebar-collapsed','');else r.removeAttribute('data-admin-sidebar-collapsed');}catch(e){}`;
}
