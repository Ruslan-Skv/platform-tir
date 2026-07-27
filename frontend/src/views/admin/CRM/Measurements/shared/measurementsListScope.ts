/** Область видимости списка замеров (/admin/measurements). */

export type MeasurementsListScope = 'mine' | 'my_directions' | 'all';

const MANAGER_LIKE_ROLES = new Set(['MANAGER', 'TECHNOLOGIST', 'SURVEYOR']);

const PRODUCTION_QUEUE_ROLES = new Set([
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
]);

export type MeasurementsListRoleDefaults = {
  listScope: MeasurementsListScope;
};

/** Дефолты при первом заходе (пока scopeTouched=false). */
export function getMeasurementsListRoleDefaults(
  role: string | null | undefined
): MeasurementsListRoleDefaults {
  if (!role) {
    return { listScope: 'all' };
  }
  if (MANAGER_LIKE_ROLES.has(role)) {
    return { listScope: 'mine' };
  }
  if (PRODUCTION_QUEUE_ROLES.has(role)) {
    return { listScope: 'my_directions' };
  }
  return { listScope: 'all' };
}
