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
