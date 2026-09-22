import {
  type AdminDashboardSectionId,
  DEFAULT_ADMIN_DASHBOARD_SECTION_ORDER,
  normalizeAdminDashboardSectionOrder,
} from '@/shared/lib/admin/admin-dashboard-sections';
import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface CatalogActivityRow {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  countInPeriod: number;
  totalCreated: number;
}

export interface CatalogActivityResponse {
  from: string;
  to: string;
  products: CatalogActivityRow[];
  categories: CatalogActivityRow[];
}

/** Продажи за текущий месяц — итоги журнала ДП по направлениям и менеджерам. */
export interface DashboardSalesMonthResponse {
  periodFrom: string;
  periodTo: string;
  totalSum: number;
  directionSums: { direction: string | null; sum: number }[];
  managerSums: { managerId: string | null; name: string; sum: number }[];
}

export interface AdminDashboardQuickLink {
  id: string;
  label: string;
  href: string;
  isEnabled: boolean;
  sortOrder: number;
}

/** Доступность блоков дашборда для роли: false — блок роли запрещён супер-админом. */
export interface AdminDashboardRoleAllowed {
  salesMonth: boolean;
  trainingDynamics: boolean;
  catalogActivity: boolean;
  calendar: boolean;
  quickLinks: boolean;
  dateToolbar: boolean;
}

export interface AdminDashboardRoleBlock extends AdminDashboardRoleAllowed {
  role: string;
}

/** Доступность отдельной быстрой ссылки для роли. */
export interface AdminDashboardRoleQuickLinkAccess {
  role: string;
  linkId: string;
  allowed: boolean;
}

export interface AdminDashboardSettings {
  salesMonthVisible: boolean;
  catalogActivityVisible: boolean;
  trainingDynamicsVisible: boolean;
  calendarVisible: boolean;
  dateToolbarVisible: boolean;
  sectionOrder: AdminDashboardSectionId[];
  quickLinks: AdminDashboardQuickLink[];
  allowedBlocks?: AdminDashboardRoleAllowed;
}

export type { AdminDashboardSectionId };

export const DEFAULT_ADMIN_DASHBOARD_QUICK_LINKS: Omit<
  AdminDashboardQuickLink,
  'id' | 'sortOrder'
>[] = [
  { label: 'Территория знаний', href: '/admin/knowledge', isEnabled: true },
  { label: 'Каталог товаров', href: '/admin/catalog/products', isEnabled: true },
  { label: 'Категории', href: '/admin/catalog/categories', isEnabled: true },
  { label: 'Заказы', href: '/admin/orders', isEnabled: true },
];

export const DEFAULT_ADMIN_DASHBOARD_SETTINGS: AdminDashboardSettings = {
  // Видимость блоков определяется только доступом роли (задаёт супер-админ)
  salesMonthVisible: true,
  catalogActivityVisible: true,
  trainingDynamicsVisible: true,
  calendarVisible: true,
  dateToolbarVisible: true,
  sectionOrder: [...DEFAULT_ADMIN_DASHBOARD_SECTION_ORDER],
  quickLinks: DEFAULT_ADMIN_DASHBOARD_QUICK_LINKS.map((link, index) => ({
    id: `default-${index}`,
    sortOrder: index,
    ...link,
  })),
};

export interface DashboardTrainingEmployeeRow {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  completedCount: number;
  trackableCount: number;
  completionPercent: number;
}

export interface DashboardTrainingDynamicsResponse {
  period: { from: string; to: string };
  summary: {
    avgCompletionPercent: number;
    totalEmployees: number;
    trackableMaterials: number;
  };
  timeline: Array<{ date: string; completionPercent: number }>;
  employees: DashboardTrainingEmployeeRow[];
}

function normalizeAdminDashboardSettings(
  data: Partial<AdminDashboardSettings> | null | undefined
): AdminDashboardSettings {
  const quickLinksRaw = data?.quickLinks;
  const quickLinks =
    Array.isArray(quickLinksRaw) && quickLinksRaw.length > 0
      ? quickLinksRaw.map((link, index) => ({
          id: link.id ?? `link-${index}`,
          label: link.label ?? '',
          href: link.href ?? '',
          isEnabled: link.isEnabled ?? true,
          sortOrder: link.sortOrder ?? index,
        }))
      : DEFAULT_ADMIN_DASHBOARD_SETTINGS.quickLinks;

  return {
    salesMonthVisible:
      data?.salesMonthVisible ?? DEFAULT_ADMIN_DASHBOARD_SETTINGS.salesMonthVisible,
    catalogActivityVisible:
      data?.catalogActivityVisible ?? DEFAULT_ADMIN_DASHBOARD_SETTINGS.catalogActivityVisible,
    trainingDynamicsVisible:
      data?.trainingDynamicsVisible ?? DEFAULT_ADMIN_DASHBOARD_SETTINGS.trainingDynamicsVisible,
    calendarVisible: data?.calendarVisible ?? DEFAULT_ADMIN_DASHBOARD_SETTINGS.calendarVisible,
    dateToolbarVisible:
      data?.dateToolbarVisible ?? DEFAULT_ADMIN_DASHBOARD_SETTINGS.dateToolbarVisible,
    sectionOrder: normalizeAdminDashboardSectionOrder(data?.sectionOrder),
    quickLinks,
    allowedBlocks: data?.allowedBlocks,
  };
}

export async function getAdminDashboardSettings(): Promise<AdminDashboardSettings> {
  const res = await apiFetch(`${API_URL}/admin/dashboard/settings`, {
    headers: getAdminAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось загрузить настройки дашборда');
  }
  return normalizeAdminDashboardSettings(await res.json());
}

export type AdminDashboardSettingsUpdate = {
  sectionOrder?: AdminDashboardSectionId[];
  quickLinks?: Array<{
    id?: string;
    label: string;
    href: string;
    isEnabled?: boolean;
  }>;
};

export async function updateAdminDashboardSettings(
  data: AdminDashboardSettingsUpdate
): Promise<AdminDashboardSettings> {
  const res = await apiFetch(`${API_URL}/admin/dashboard/settings`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось сохранить настройки дашборда');
  }
  return normalizeAdminDashboardSettings(await res.json());
}

export async function getAdminDashboardRoleBlocks(): Promise<AdminDashboardRoleBlock[]> {
  const res = await apiFetch(`${API_URL}/admin/dashboard/settings/role-blocks`, {
    headers: getAdminAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось загрузить доступность блоков по ролям');
  }
  return res.json();
}

export type AdminDashboardRoleBlockUpdate = {
  role: string;
} & Partial<AdminDashboardRoleAllowed>;

export async function updateAdminDashboardRoleBlock(
  data: AdminDashboardRoleBlockUpdate
): Promise<AdminDashboardRoleBlock> {
  const res = await apiFetch(`${API_URL}/admin/dashboard/settings/role-blocks`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось сохранить доступность блоков для роли');
  }
  return res.json();
}

export async function getAdminDashboardRoleQuickLinks(): Promise<
  AdminDashboardRoleQuickLinkAccess[]
> {
  const res = await apiFetch(`${API_URL}/admin/dashboard/settings/role-quick-links`, {
    headers: getAdminAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось загрузить доступность быстрых ссылок по ролям');
  }
  return res.json();
}

export async function updateAdminDashboardRoleQuickLinks(data: {
  role: string;
  items: Array<{ linkId: string; allowed: boolean }>;
}): Promise<AdminDashboardRoleQuickLinkAccess[]> {
  const res = await apiFetch(`${API_URL}/admin/dashboard/settings/role-quick-links`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось сохранить доступность быстрых ссылок для роли');
  }
  return res.json();
}

export async function getCatalogActivity(from: Date, to: Date): Promise<CatalogActivityResponse> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const res = await apiFetch(`${API_URL}/admin/dashboard/catalog-activity?${params}`, {
    headers: getAdminAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось загрузить статистику');
  }
  return res.json();
}

export async function getDashboardSalesMonth(): Promise<DashboardSalesMonthResponse> {
  const res = await apiFetch(`${API_URL}/admin/dashboard/sales-month`, {
    headers: getAdminAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось загрузить продажи за месяц');
  }
  return res.json();
}

export async function getDashboardTrainingDynamics(
  dateFrom: string,
  dateTo: string
): Promise<DashboardTrainingDynamicsResponse> {
  const params = new URLSearchParams({ dateFrom, dateTo });
  const res = await apiFetch(`${API_URL}/admin/dashboard/training-dynamics?${params}`, {
    headers: getAdminAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось загрузить динамику обучения');
  }
  return res.json();
}
