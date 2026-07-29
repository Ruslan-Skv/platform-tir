import type { CustomerTypeFilter } from '../shared/customersDirectoryListState';

export const TYPE_FILTER_OPTIONS: { value: CustomerTypeFilter; label: string }[] = [
  { value: 'all', label: 'Все типы' },
  { value: 'PERSON', label: 'ФЛ' },
  { value: 'ENTREPRENEUR', label: 'ИП' },
  { value: 'COMPANY', label: 'ЮЛ' },
];
