export type PublicCatalogSort =
  | 'default'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'name-desc'
  | 'new'
  | 'rating';

/** Ответ публичного API каталога / сравнения — одна карточка до маппинга в `Product`. */
export interface CatalogApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: string;
  comparePrice: string | null;
  stock: number;
  onOrder?: boolean;
  isActive: boolean;
  isNew: boolean;
  isFeatured: boolean;
  isPartnerProduct?: boolean;
  images: string[];
  videoUrl?: string | null;
  attributes: Record<string, unknown> | null;
  manufacturer?: { id: string; name: string; slug?: string } | null;
  doorThickness?: { id: string; name: string; slug?: string } | null;
  weatherstrip?: { id: string; name: string; slug?: string } | null;
  sortOrder?: number;
  createdAt?: string;
  rating?: number;
  reviewsCount?: number;
  category: {
    id: string;
    name: string;
    slug: string;
    parent?: { id: string; name: string; slug: string } | null;
  };
  partner?: {
    id: string;
    name: string;
    logoUrl: string | null;
    showLogoOnCards?: boolean;
    tooltipText?: string | null;
    showTooltip?: boolean;
  } | null;
  cardVariants?: Array<{
    id: string;
    name: string;
    price: string | number;
    image?: string | null;
    size?: string | null;
    color?: string | null;
    extraOption?: string | null;
    sortOrder?: number;
  }>;
  cardBadgeSelections?: Array<{
    sortOrder: number;
    badge: {
      id: string;
      key: string;
      label: string;
      imageUrl: string | null;
      description?: string | null;
    };
  }>;
}
