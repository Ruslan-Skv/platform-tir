/** Область видимости списка расчётов (аналог договоров, без «моих направлений»). */

export type EstimatesListScope = 'mine' | 'all';

const MANAGER_LIKE_ROLES = new Set(['MANAGER', 'TECHNOLOGIST', 'TRAINEE', 'CONTENT_MANAGER']);

export type EstimatesListRoleDefaults = {
  listScope: EstimatesListScope;
};

/** Дефолты при первом заходе (пока scopeTouched=false). */
export function getEstimatesListRoleDefaults(
  role: string | null | undefined
): EstimatesListRoleDefaults {
  if (!role) {
    return { listScope: 'all' };
  }
  if (MANAGER_LIKE_ROLES.has(role)) {
    return { listScope: 'mine' };
  }
  return { listScope: 'all' };
}
