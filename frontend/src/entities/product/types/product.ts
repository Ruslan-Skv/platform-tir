export interface Product {
  id: number;
  originalId?: string; // Оригинальный ID из API (string)
  slug: string;
  name: string;
  sku?: string;
  description?: string;
  price: number;
  oldPrice?: number;
  image: string;
  images?: string[];
  category: string;
  categoryId?: number;
  rating: number;
  reviewsCount?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  isPartnerProduct?: boolean;
  /** URL логотипа партнёра (из Partner.logoUrl при привязке товара к партнёру) */
  partnerLogoUrl?: string | null;
  /** Показывать логотип партнёра на карточках (настройка конкретного партнёра) */
  partnerShowLogoOnCards?: boolean;
  /** Название партнёра (для подсказки по умолчанию) */
  partnerName?: string | null;
  /** Текст всплывающей подсказки (если пусто — "Товар Партнёра : название") */
  partnerTooltipText?: string | null;
  /** Показывать всплывающую подсказку при наведении на логотип */
  partnerShowTooltip?: boolean;
  isSale?: boolean;
  discount?: number;
  inStock?: boolean;
  characteristics?: ProductCharacteristic[];
  // Дополнительные поля для сортировки
  sortOrder?: number;
  createdAt?: number;
}

export interface ProductCharacteristic {
  name: string;
  value: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  parentId?: number;
  productCount?: number;
  image?: string;
}
