export type ColumnKey =
  | 'name'
  | 'logoUrl'
  | 'website'
  | 'email'
  | 'phone'
  | 'productsCount'
  | 'isActive'
  | 'actions';

export interface Partner {
  id: string;
  name: string;
  logoUrl?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string[] | null;
  description?: string | null;
  isActive: boolean;
  sortOrder?: number;
  _count?: {
    products: number;
  };
}

export interface ColumnDefinition {
  key: string;
  label: string;
  defaultVisible: boolean;
  render: (partner: Partner) => React.ReactNode;
}

export type PartnersDeleteModalState = {
  isOpen: boolean;
  partner: Partner | null;
};
