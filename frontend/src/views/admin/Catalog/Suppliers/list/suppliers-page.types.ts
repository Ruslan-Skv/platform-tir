import type { ReactNode } from 'react';

export type ColumnKey =
  | 'legalName'
  | 'commercialName'
  | 'inn'
  | 'phone'
  | 'email'
  | 'website'
  | 'legalAddress'
  | 'bankName'
  | 'bankAccount'
  | 'bankBik'
  | 'productsCount'
  | 'isActive'
  | 'actions';

export interface Supplier {
  id: string;
  legalName: string;
  commercialName?: string | null;
  website?: string | null;
  legalAddress?: string | null;
  inn?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankBik?: string | null;
  email?: string | null;
  phone?: string[] | null;
  isActive: boolean;
  _count?: {
    products: number;
  };
}

export interface ColumnDefinition {
  key: string;
  label: string;
  defaultVisible: boolean;
  render: (supplier: Supplier) => ReactNode;
}
