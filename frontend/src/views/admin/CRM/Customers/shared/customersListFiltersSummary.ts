import type { CrmUser } from '@/shared/api/admin-crm';

import { formatCrmUserOptionLabel } from './crmCustomerDisplay';
import type { CustomerTypeFilter, CustomersPageLimit } from './customersDirectoryListState';
import type { CustomersListScope } from './customersListScope';

const FILTERS_COLLAPSED_STORAGE_KEY = 'admin_customers_list_filters_collapsed_v1';

const SCOPE_LABELS: Record<CustomersListScope, string> = {
  mine: 'Мои',
  all: 'Все',
};

const TYPE_LABELS: Record<CustomerTypeFilter, string> = {
  all: 'Все типы',
  PERSON: 'ФЛ',
  ENTREPRENEUR: 'ИП',
  COMPANY: 'ЮЛ',
};

export type CustomersFiltersSummaryItem = {
  key: string;
  label: string;
};

export function loadCustomersListFiltersCollapsed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(FILTERS_COLLAPSED_STORAGE_KEY);
    if (raw === '0' || raw === 'false') return false;
    return true;
  } catch {
    return true;
  }
}

export function persistCustomersListFiltersCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FILTERS_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Краткие подписи включённых настроек для свёрнутой панели фильтров. */
export function buildCustomersListFiltersSummary(params: {
  listScope: CustomersListScope;
  typeFilter: CustomerTypeFilter;
  search: string;
  authorFilter: string;
  authorOptions: CrmUser[];
  limit: CustomersPageLimit;
}): CustomersFiltersSummaryItem[] {
  const items: CustomersFiltersSummaryItem[] = [
    {
      key: 'scope',
      label: `Очередь: ${SCOPE_LABELS[params.listScope]}`,
    },
  ];

  if (params.typeFilter !== 'all') {
    items.push({
      key: 'type',
      label: `Тип: ${TYPE_LABELS[params.typeFilter]}`,
    });
  }

  const searchTrim = params.search.trim();
  if (searchTrim) {
    items.push({ key: 'search', label: `Поиск: «${searchTrim}»` });
  }

  if (params.listScope !== 'mine' && params.authorFilter) {
    const authorLabel =
      params.authorFilter === '_none'
        ? 'Без автора'
        : formatCrmUserOptionLabel(
            params.authorOptions.find((u) => u.id === params.authorFilter) ?? {
              id: params.authorFilter,
              email: params.authorFilter,
              firstName: null,
              lastName: null,
              role: '',
            }
          );
    items.push({ key: 'author', label: `Автор: ${authorLabel}` });
  }

  items.push({ key: 'limit', label: `${params.limit} на странице` });

  return items;
}
