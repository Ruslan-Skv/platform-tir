export const ADMIN_DASHBOARD_SECTION_IDS = [
  'trainingDynamics',
  'catalogActivity',
  'calendar',
  'quickLinks',
] as const;

export type AdminDashboardSectionId = (typeof ADMIN_DASHBOARD_SECTION_IDS)[number];

export const DEFAULT_ADMIN_DASHBOARD_SECTION_ORDER: AdminDashboardSectionId[] = [
  'trainingDynamics',
  'catalogActivity',
  'calendar',
  'quickLinks',
];

export const ADMIN_DASHBOARD_SECTION_LABELS: Record<AdminDashboardSectionId, string> = {
  trainingDynamics: 'Динамика обучения сотрудников',
  catalogActivity: 'Добавление товаров в каталог',
  calendar: 'Календарь',
  quickLinks: 'Быстрые ссылки',
};

const ALLOWED_SECTION_IDS = new Set<string>(ADMIN_DASHBOARD_SECTION_IDS);

export function normalizeAdminDashboardSectionOrder(raw: unknown): AdminDashboardSectionId[] {
  const result: AdminDashboardSectionId[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (
        typeof item === 'string' &&
        ALLOWED_SECTION_IDS.has(item) &&
        !result.includes(item as AdminDashboardSectionId)
      ) {
        result.push(item as AdminDashboardSectionId);
      }
    }
  }

  for (const id of DEFAULT_ADMIN_DASHBOARD_SECTION_ORDER) {
    if (!result.includes(id)) {
      result.push(id);
    }
  }

  return result;
}

export function moveItemInArray<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
