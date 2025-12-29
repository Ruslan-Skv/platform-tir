export interface Product {
  id: number;
  name: string;
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
  isSale?: boolean;
  discount?: number;
  inStock?: boolean;
  characteristics?: ProductCharacteristic[];
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
