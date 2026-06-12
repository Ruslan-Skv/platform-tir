import type { Review } from '@/shared/api/reviews';

export interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: string;
  comparePrice: string | null;
  stock: number;
  onOrder?: boolean;
  images: string[];
  videoUrl?: string | null;
  weight?: number | null;
  isNew: boolean;
  isFeatured: boolean;
  attributes:
    | Array<{ name: string; value: string; slug?: string }>
    | Record<string, unknown>
    | null;
  sizes?: string[];
  openingSide?: string[];
  category: {
    id: string;
    name: string;
    slug: string;
    parent?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
  rating?: number;
  reviewsCount?: number;
  reviews?: Review[];
  cardVariants?: Array<{
    id: string;
    name: string;
    price: number | string;
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

export interface CategoryAttribute {
  id: string;
  attributeId: string;
  isRequired: boolean;
  order: number;
  attribute: {
    id: string;
    name: string;
    slug: string;
  };
}

export type AttributeItem = { name: string; value: string; slug?: string };

export interface ProductCardBadgeDefinition {
  id: string;
  key: string;
  label: string;
  imageUrl: string | null;
  description?: string | null;
}

export interface ProductDetailPageProps {
  slug: string;
}

export type DeliveryType = 'polotno' | 'komplekt';

export interface ProductVariant {
  id: string;
  size: string;
  openingSide: string;
  quantity: number;
  deliveryType: DeliveryType | '';
}
