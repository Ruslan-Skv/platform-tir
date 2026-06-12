import type { CustomerTypeFilter } from './customersDirectoryListState';

export const TYPE_FILTER_OPTIONS: { value: CustomerTypeFilter; label: string }[] = [
  { value: 'all', label: 'Все типы' },
  { value: 'PERSON', label: 'Физическое лицо (ФЛ)' },
  { value: 'ENTREPRENEUR', label: 'Индивидуальный предприниматель (ИП)' },
  { value: 'COMPANY', label: 'Юридическое лицо (ЮЛ)' },
];
