/** Область видимости списка заказчиков (/admin/customers). */

export type CustomersListScope = 'mine' | 'all';

const MANAGER_LIKE_ROLES = new Set(['MANAGER', 'TECHNOLOGIST', 'SURVEYOR']);

export type CustomersListRoleDefaults = {
  listScope: CustomersListScope;
};

/** Дефолты при первом заходе (пока scopeTouched=false). */
export function getCustomersListRoleDefaults(
  role: string | null | undefined
): CustomersListRoleDefaults {
  if (!role) {
    return { listScope: 'all' };
  }
  if (MANAGER_LIKE_ROLES.has(role)) {
    return { listScope: 'mine' };
  }
  return { listScope: 'all' };
}
