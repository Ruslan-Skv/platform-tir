import { Prisma } from '@prisma/client';

export interface BulkUpdateDto {
  ids: string[];
  data: {
    price?: number;
    comparePrice?: number;
    stock?: number;
    isActive?: boolean;
    isFeatured?: boolean;
    isNew?: boolean;
    categoryId?: string;
    manufacturerId?: string;
  };
}

export interface ImportProductDto {
  name: string;
  slug: string;
  sku?: string;
  price: number;
  comparePrice?: number;
  stock?: number;
  categoryId: string;
  manufacturerId?: string;
  description?: string;
  images?: string[];
  isActive?: boolean;
}

export const MAX_BULK_IDS = 1000;
export const MAX_IMPORT_PRODUCTS = 500;
export const MAX_LIST_LIMIT = 100;
export const LOW_STOCK_THRESHOLD = 5;
export const PRODUCT_SEARCH_INDEX = 'products';

export const ADMIN_PRODUCT_LIST_SELECT = {
  id: true,
  name: true,
  sku: true,
  price: true,
  comparePrice: true,
  stock: true,
  sortOrder: true,
  isActive: true,
  isFeatured: true,
  isNew: true,
  isPartnerProduct: true,
  attributes: true,
  images: true,
  updatedAt: true,
  createdAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  manufacturer: {
    select: {
      id: true,
      name: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  suppliers: {
    where: { isMainSupplier: true },
    take: 1,
    select: {
      id: true,
      supplierId: true,
      isMainSupplier: true,
      supplierSku: true,
      supplierPrice: true,
      supplierProductUrl: true,
      supplierPriceChangedAt: true,
      supplierPriceSyncError: true,
      supplierPriceSyncErrorCode: true,
      supplierPriceSyncErrorAt: true,
      supplier: {
        select: {
          id: true,
          legalName: true,
          commercialName: true,
        },
      },
    },
  },
} satisfies Prisma.ProductSelect;

export type AdminProductListSortOrder = 'asc' | 'desc';

export const ADMIN_PRODUCT_SORT_FIELDS: Record<
  string,
  (order: AdminProductListSortOrder) => Prisma.ProductOrderByWithRelationInput
> = {
  name: (order) => ({ name: order }),
  sku: (order) => ({ sku: order }),
  price: (order) => ({ price: order }),
  stock: (order) => ({ stock: order }),
  sortOrder: (order) => ({ sortOrder: order }),
  isActive: (order) => ({ isActive: order }),
  isFeatured: (order) => ({ isFeatured: order }),
  isNew: (order) => ({ isNew: order }),
  updatedAt: (order) => ({ updatedAt: order }),
  createdAt: (order) => ({ createdAt: order }),
  'category.name': (order) => ({ category: { name: order } }),
  createdBy: (order) => ({ createdBy: { email: order } }),
};
