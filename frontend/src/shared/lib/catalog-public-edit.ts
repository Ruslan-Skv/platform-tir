/** Роли, которым разрешено править каталог с публичного сайта (режим «Редактировать публичный сайт»). */
const CATALOG_PUBLIC_EDIT_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MODERATOR']);

export function canRoleEditCatalogOnPublicSite(role: string | null | undefined): boolean {
  if (!role) return false;
  return CATALOG_PUBLIC_EDIT_ROLES.has(role);
}

export function getAdminBearerTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token') || localStorage.getItem('user_token');
}

export function getAdminRoleFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('admin_user') || localStorage.getItem('user_data');
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as { role?: string };
    return typeof u.role === 'string' ? u.role : null;
  } catch {
    return null;
  }
}

export function canEditCatalogOnPublicSite(): boolean {
  const token = getAdminBearerTokenFromStorage();
  const role = getAdminRoleFromStorage();
  if (!token || !role) return false;
  return CATALOG_PUBLIC_EDIT_ROLES.has(role);
}
