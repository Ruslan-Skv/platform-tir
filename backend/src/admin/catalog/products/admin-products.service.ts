import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

interface BulkUpdateDto {
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

interface ImportProductDto {
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

@Injectable()
export class AdminProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    search?: string;
    categoryId?: string;
    manufacturerId?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    minPrice?: number;
    maxPrice?: number;
    lowStock?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      search,
      categoryId,
      manufacturerId,
      isActive,
      isFeatured,
      minPrice,
      maxPrice,
      lowStock,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params || {};

    const skip = (page - 1) * limit;
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (manufacturerId) {
      where.manufacturerId = manufacturerId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = new Prisma.Decimal(minPrice);
      }
      if (maxPrice !== undefined) {
        where.price.lte = new Prisma.Decimal(maxPrice);
      }
    }

    if (lowStock) {
      // Filter products where stock <= minStock threshold
      where.AND = [
        {
          stock: { lte: 10 }, // Default low stock threshold
        },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
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
          _count: {
            select: {
              orderItems: true,
              reviews: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        manufacturer: true,
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            orderItems: true,
            reviews: true,
            cartItems: true,
            wishlist: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  // Bulk operations
  async bulkUpdate(bulkUpdateDto: BulkUpdateDto) {
    const { ids, data } = bulkUpdateDto;

    if (!ids.length) {
      throw new BadRequestException('No product IDs provided');
    }

    const updateData: Prisma.ProductUpdateManyMutationInput = {};

    if (data.price !== undefined) {
      updateData.price = new Prisma.Decimal(data.price);
    }
    if (data.comparePrice !== undefined) {
      updateData.comparePrice = new Prisma.Decimal(data.comparePrice);
    }
    if (data.stock !== undefined) {
      updateData.stock = data.stock;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.isFeatured !== undefined) {
      updateData.isFeatured = data.isFeatured;
    }
    if (data.isNew !== undefined) {
      updateData.isNew = data.isNew;
    }

    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  async bulkDelete(ids: string[]) {
    if (!ids.length) {
      throw new BadRequestException('No product IDs provided');
    }

    const result = await this.prisma.product.deleteMany({
      where: { id: { in: ids } },
    });

    return {
      success: true,
      deletedCount: result.count,
    };
  }

  async bulkActivate(ids: string[], isActive: boolean) {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  async bulkUpdatePrices(updates: { id: string; price?: number; comparePrice?: number }[]) {
    const results = await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.product.update({
          where: { id: update.id },
          data: {
            price: update.price !== undefined ? new Prisma.Decimal(update.price) : undefined,
            comparePrice:
              update.comparePrice !== undefined
                ? new Prisma.Decimal(update.comparePrice)
                : undefined,
          },
        }),
      ),
    );

    return {
      success: true,
      updatedCount: results.length,
    };
  }

  async bulkUpdateStock(updates: { id: string; stock: number }[]) {
    const results = await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.product.update({
          where: { id: update.id },
          data: { stock: update.stock },
        }),
      ),
    );

    return {
      success: true,
      updatedCount: results.length,
    };
  }

  // Import/Export
  async importProducts(products: ImportProductDto[]) {
    const results = {
      created: 0,
      updated: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        // Check if product exists by SKU
        const existing = product.sku
          ? await this.prisma.product.findUnique({ where: { sku: product.sku } })
          : await this.prisma.product.findUnique({ where: { slug: product.slug } });

        if (existing) {
          // Update existing
          await this.prisma.product.update({
            where: { id: existing.id },
            data: {
              name: product.name,
              price: new Prisma.Decimal(product.price),
              comparePrice: product.comparePrice ? new Prisma.Decimal(product.comparePrice) : null,
              stock: product.stock ?? existing.stock,
              categoryId: product.categoryId,
              manufacturerId: product.manufacturerId,
              description: product.description,
              images: product.images ?? existing.images,
              isActive: product.isActive ?? existing.isActive,
            },
          });
          results.updated++;
        } else {
          // Create new
          await this.prisma.product.create({
            data: {
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              price: new Prisma.Decimal(product.price),
              comparePrice: product.comparePrice ? new Prisma.Decimal(product.comparePrice) : null,
              stock: product.stock ?? 0,
              categoryId: product.categoryId,
              manufacturerId: product.manufacturerId,
              description: product.description,
              images: product.images ?? [],
              isActive: product.isActive ?? true,
            },
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  async exportProducts(params?: {
    categoryId?: string;
    manufacturerId?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.ProductWhereInput = {};

    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params?.manufacturerId) {
      where.manufacturerId = params.manufacturerId;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        manufacturer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      price: p.price.toString(),
      comparePrice: p.comparePrice?.toString() || '',
      stock: p.stock,
      category: p.category.name,
      categorySlug: p.category.slug,
      manufacturer: p.manufacturer?.name || '',
      description: p.description || '',
      images: p.images.join(';'),
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  // Statistics
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

  // Reviews management
  async getReviews(productId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveReview(reviewId: string) {
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isApproved: true },
    });
  }

  async deleteReview(reviewId: string) {
    return this.prisma.review.delete({
      where: { id: reviewId },
    });
  }
}
