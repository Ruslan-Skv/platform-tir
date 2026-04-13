/** Соответствует логике backend/src/site-public/admin-link-roles.util.ts (форма админки). */

function filterRoleStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((r): r is string => typeof r === 'string');
}

function parseChannelForAdminForm(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const a = filterRoleStrings(value);
    return a.length > 0 ? a : [];
  }
  return null;
}

/** Разбор поля rolesShowAdminLink из API (массив или { desktop, mobile }). */
export function parseRolesShowAdminLinkFromApi(raw: unknown): {
  desktop: string[] | null;
  mobile: string[] | null;
} {
  if (raw === null || raw === undefined) {
    return { desktop: null, mobile: null };
  }
  if (Array.isArray(raw)) {
    const arr = filterRoleStrings(raw);
    const v = arr.length > 0 ? arr : null;
    return { desktop: v, mobile: v };
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      desktop: parseChannelForAdminForm(o.desktop),
      mobile: parseChannelForAdminForm(o.mobile),
    };
  }
  return { desktop: null, mobile: null };
}
