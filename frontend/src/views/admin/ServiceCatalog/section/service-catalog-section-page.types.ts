import type { SERVICE_ICON_OPTIONS } from '../shared/SERVICE_ICON_OPTIONS';

export type ServiceIconOptionValue = (typeof SERVICE_ICON_OPTIONS)[number]['value'];

export type FlatCategoryOption = {
  id: string;
  name: string;
};

export type NewServiceCategoryForm = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  icon: ServiceIconOptionValue | '';
  image: string;
  cardBackgroundImage: string;
  cardBackgroundTransparent: boolean;
  showPricesInPublic: boolean;
  priceMarkupPercent: number;
  isActive: boolean;
};

export type ServiceCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  sortOrder: number;
  isActive: boolean;
  category?: { id: string; name: string; slug: string };
};

export type ServiceCatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  cardBackgroundImage?: string | null;
  cardBackgroundTransparent?: boolean;
  showPricesInPublic: boolean;
  priceMarkupPercent?: number;
  sortOrder: number;
  isActive: boolean;
  parentId?: string | null;
  children?: ServiceCatalogCategory[];
  items?: ServiceCatalogItem[];
  _count?: { items: number };
};

export type EditServiceCategoryForm = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  icon: string;
  image: string;
  cardBackgroundImage: string;
  cardBackgroundTransparent: boolean;
  showPricesInPublic: boolean;
  priceMarkupPercent: number;
  isActive: boolean;
};

export type DeleteTarget = {
  type: 'category';
  id: string;
  name: string;
  nestedCategoryCount: number;
};
