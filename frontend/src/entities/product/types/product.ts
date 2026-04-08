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
  /** Slug листовой категории из API (каталог: фильтр по подкатегориям) */
  categorySlug?: string;
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
  /** Админ: при нулевом остатке показывать «Под заказ» (если остаток > 0, на витрине всё равно «В наличии»). */
  onOrder?: boolean;
  characteristics?: ProductCharacteristic[];
  // Дополнительные поля для сортировки
  sortOrder?: number;
  createdAt?: number;
  /** Схожие товары в одной карточке (до 5): выбор варианта по цене, размеру, фото, названию, цвету, доп. опции */
  cardVariants?: ProductCardVariant[];
  /** URL видеоролика о товаре (YouTube, Vimeo или свой хостинг) */
  videoUrl?: string | null;
  /** Масса товара, кг */
  weight?: number | null;
  /** Публичный каталог: остаток и сырые атрибуты для фильтров */
  stock?: number;
  manufacturerId?: string | null;
  /** Подписи из справочников (согласованы с фасетами каталога по slug door-thickness / weatherstrip) */
  doorThicknessLabel?: string | null;
  weatherstripLabel?: string | null;
  attributes?: unknown;
  /** Бэйджи слева от фото (JPG из настроек каталога), только с загруженным imageUrl */
  catalogBadges?: Array<{
    id: string;
    key: string;
    label: string;
    imageUrl: string;
    /** Подсказка при наведении; если пусто — можно показать label */
    description?: string | null;
  }>;
}

export interface ProductCardVariant {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  size?: string | null;
  color?: string | null;
  extraOption?: string | null;
  sortOrder?: number;
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
