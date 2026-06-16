import type { BackendRole } from '@/shared/config/admin-roles';
import { ROLES_CONFIG } from '@/shared/config/admin-roles';

const ROLE_LABELS = Object.fromEntries(ROLES_CONFIG.map((role) => [role.id, role.label])) as Record<
  BackendRole,
  string
>;

export function formatEmployeeName(parts: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = `${parts.firstName ?? ''} ${parts.lastName ?? ''}`.trim();
  return name || parts.email;
}

export function formatRoleLabel(role: string): string {
  return ROLE_LABELS[role as BackendRole] ?? role;
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatPercentWithSymbol(value: number): string {
  return `${formatPercent(value)}%`;
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function resolveAnalyticsRange(
  period: string,
  customFrom: string,
  customTo: string
): { dateFrom: string; dateTo: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateTo = toDateInputValue(today);

  if (period === 'custom' && customFrom && customTo) {
    return { dateFrom: customFrom, dateTo: customTo };
  }

  const from = new Date(today);
  if (period === 'week') {
    from.setDate(from.getDate() - 6);
  } else if (period === 'quarter') {
    from.setDate(from.getDate() - 89);
  } else if (period === 'year') {
    from.setDate(from.getDate() - 364);
  } else {
    from.setDate(from.getDate() - 29);
  }

  return { dateFrom: toDateInputValue(from), dateTo };
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMaterialTypeLabel(type: string): string {
  switch (type) {
    case 'VIDEO':
      return 'Видео';
    case 'ARTICLE':
      return 'Статья';
    case 'LINK':
      return 'Ссылка';
    default:
      return type;
  }
}

export function chartToneClass(index: number): string {
  return `tone${index % 8}`;
}
