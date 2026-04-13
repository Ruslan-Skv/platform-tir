/** Публичный дефолт, если в БД null или канал не задан. */
export const DEFAULT_ADMIN_LINK_ROLES = ['SUPER_ADMIN'];

function filterRoleStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((r): r is string => typeof r === 'string');
}

function resolveOneChannel(value: unknown): string[] {
  if (value === null || value === undefined) {
    return DEFAULT_ADMIN_LINK_ROLES;
  }
  if (Array.isArray(value)) {
    return filterRoleStrings(value);
  }
  return DEFAULT_ADMIN_LINK_ROLES;
}

/** Резолв для публичного API: десктоп (шапка) и мобильный нижний бар. */
export function resolveAdminLinkRolesForPublic(raw: unknown): {
  desktop: string[];
  mobile: string[];
} {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      desktop: resolveOneChannel(o.desktop),
      mobile: resolveOneChannel(o.mobile),
    };
  }
  const shared =
    Array.isArray(raw) && raw.length > 0 ? filterRoleStrings(raw) : DEFAULT_ADMIN_LINK_ROLES;
  return { desktop: shared, mobile: shared };
}

function parseChannelForAdminForm(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const a = filterRoleStrings(value);
    return a.length > 0 ? a : [];
  }
  return null;
}

/** Состояние формы в админке: null = «как дефолт сервера» (чекбоксы из DEFAULT_ROLES на клиенте). */
export function parseAdminLinkRolesForAdminForm(raw: unknown): {
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
