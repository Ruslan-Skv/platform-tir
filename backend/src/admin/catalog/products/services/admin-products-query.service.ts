import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import {
  productCardBadgeSelectionsInclude,
  productCardVariantsInclude,
  productCreatedByUpdatedByInclude,
} from '../../../../products/services/products-includes';
import {
  ADMIN_PRODUCT_LIST_SELECT,
  ADMIN_PRODUCT_SORT_FIELDS,
  AdminProductListSortOrder,
  LOW_STOCK_THRESHOLD,
  MAX_LIST_LIMIT,
} from '../admin-products-shared';

@Injectable()
export class AdminProductsQueryService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    search?: string;
    categoryId?: string;
    manufacturerId?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    isNew?: boolean;
    minPrice?: number;
    maxPrice?: number;
    stockFilter?: 'in-stock' | 'out-of-stock' | 'low-stock';
    createdById?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: AdminProductListSortOrder;
  }) {
    const {
      search,
      categoryId,
      manufacturerId,
      isActive,
      isFeatured,
      isNew,
      minPrice,
      maxPrice,
      stockFilter,
      createdById,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
    } = params || {};

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), MAX_LIST_LIMIT);
    const skip = (safePage - 1) * safeLimit;
    const where: Prisma.ProductWhereInput = {};
    const andConditions: Prisma.ProductWhereInput[] = [];

    if (search?.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (categoryId) {
      const categoryIds = await this.resolveCategoryIdsWithDescendants(categoryId);
      if (categoryIds.length > 0) {
        andConditions.push({ categoryId: { in: categoryIds } });
      }
    }

    if (manufacturerId) {
      andConditions.push({ manufacturerId });
    }

    if (isActive !== undefined) {
      andConditions.push({ isActive });
    }

    if (isFeatured !== undefined) {
      andConditions.push({ isFeatured });
    }

    if (isNew !== undefined) {
      andConditions.push({ isNew });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Prisma.DecimalFilter = {};
      if (minPrice !== undefined) {
        priceFilter.gte = new Prisma.Decimal(minPrice);
      }
      if (maxPrice !== undefined) {
        priceFilter.lte = new Prisma.Decimal(maxPrice);
      }
      andConditions.push({ price: priceFilter });
    }

    if (stockFilter === 'in-stock') {
      andConditions.push({ stock: { gt: 0 } });
    } else if (stockFilter === 'out-of-stock') {
      andConditions.push({ stock: 0 });
    } else if (stockFilter === 'low-stock') {
      andConditions.push({ stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } });
    }

    if (createdById === '__none__') {
      andConditions.push({ createdById: null });
    } else if (createdById) {
      andConditions.push({ createdById });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const orderByFn = ADMIN_PRODUCT_SORT_FIELDS[sortBy] ?? ADMIN_PRODUCT_SORT_FIELDS.name;
    const orderBy = orderByFn(sortOrder);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: ADMIN_PRODUCT_LIST_SELECT,
        skip,
        take: safeLimit,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getProductAuthors() {
    const users = await this.prisma.user.findMany({
      where: {
        productsCreated: { some: {} },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { email: 'asc' }],
    });

    return users.map((user) => ({
      id: user.id,
      label: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    }));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                legalName: true,
                commercialName: true,
              },
            },
          },
        },
        manufacturer: {
          select: { id: true, name: true, slug: true },
        },
        coatingMaterial: {
          select: { id: true, name: true, slug: true },
        },
        canvasType: {
          select: { id: true, name: true, slug: true },
        },
        doorThickness: {
          select: { id: true, name: true, slug: true },
        },
        weatherstrip: {
          select: { id: true, name: true, slug: true },
        },
        ...productCardVariantsInclude,
        ...productCardBadgeSelectionsInclude,
        ...productCreatedByUpdatedByInclude,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async getStats() {
    const [totalProducts, activeProducts, outOfStock, lowStock, featuredProducts] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.product.count({ where: { stock: 0 } }),
        this.prisma.product.count({ where: { stock: { lte: 10, gt: 0 } } }),
        this.prisma.product.count({ where: { isFeatured: true } }),
      ]);

    const priceStats = await this.prisma.product.aggregate({
      _avg: { price: true },
      _min: { price: true },
      _max: { price: true },
    });

    return {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      outOfStock,
      lowStock,
      featuredProducts,
      avgPrice: priceStats._avg.price,
      minPrice: priceStats._min.price,
      maxPrice: priceStats._max.price,
    };
  }

  private async resolveCategoryIdsWithDescendants(categoryId: string): Promise<string[]> {
    const allCategories = await this.prisma.category.findMany({
      select: { id: true, parentId: true },
    });

    const childrenByParent = new Map<string, string[]>();
    for (const category of allCategories) {
      if (!category.parentId) continue;
      const siblings = childrenByParent.get(category.parentId) ?? [];
      siblings.push(category.id);
      childrenByParent.set(category.parentId, siblings);
    }

    const ids: string[] = [];
    const collect = (id: string) => {
      ids.push(id);
      for (const childId of childrenByParent.get(id) ?? []) {
        collect(childId);
      }
    };
    collect(categoryId);
    return ids;
  }
}
