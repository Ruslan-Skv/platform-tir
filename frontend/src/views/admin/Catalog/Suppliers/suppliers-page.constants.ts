import type { ColumnKey } from './suppliers-page.types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const STORAGE_KEY = 'suppliers_table_columns';

export const COLUMN_META: Record<ColumnKey, { label: string; defaultVisible: boolean }> = {
  legalName: { label: 'Наименование юридическое', defaultVisible: true },
  commercialName: { label: 'Наименование коммерческое', defaultVisible: true },
  inn: { label: 'ИНН', defaultVisible: true },
  phone: { label: 'Телефоны', defaultVisible: true },
  email: { label: 'Email', defaultVisible: false },
  website: { label: 'Сайт', defaultVisible: true },
  legalAddress: { label: 'Юридический адрес', defaultVisible: false },
  bankName: { label: 'Банк', defaultVisible: false },
  bankAccount: { label: 'Расчетный счет', defaultVisible: false },
  bankBik: { label: 'БИК', defaultVisible: false },
  productsCount: { label: 'Товаров', defaultVisible: true },
  isActive: { label: 'Статус', defaultVisible: true },
  actions: { label: 'Действия', defaultVisible: true },
};

export const DEFAULT_VISIBLE_COLUMNS = (Object.keys(COLUMN_META) as ColumnKey[]).filter(
  (key) => COLUMN_META[key].defaultVisible
);
