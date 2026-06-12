import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { ElasticsearchService } from '../../../../elasticsearch/elasticsearch.service';
import {
  BulkUpdateDto,
  ImportProductDto,
  MAX_BULK_IDS,
  MAX_IMPORT_PRODUCTS,
  PRODUCT_SEARCH_INDEX,
} from '../admin-products-shared';

@Injectable()
export class AdminProductsBulkService {
  constructor(
    private prisma: PrismaService,
    private elasticsearch: ElasticsearchService,
  ) {}

  async bulkUpdate(bulkUpdateDto: BulkUpdateDto) {
    const { ids, data } = bulkUpdateDto;

    if (!ids.length) {
      throw new BadRequestException('No product IDs provided');
    }
    if (ids.length > MAX_BULK_IDS) {
      throw new BadRequestException(`Maximum ${MAX_BULK_IDS} products per request`);
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
    if (ids.length > MAX_BULK_IDS) {
      throw new BadRequestException(`Maximum ${MAX_BULK_IDS} products per request`);
    }

    await this.prisma.productSupplier.deleteMany({
      where: { productId: { in: ids } },
    });

    const result = await this.prisma.product.deleteMany({
      where: { id: { in: ids } },
    });

    await Promise.all(
      ids.map((id) =>
        this.elasticsearch.deleteDocument(PRODUCT_SEARCH_INDEX, id).catch(() => {
          /* индекс может быть отключён */
        }),
      ),
    );

    return {
      success: true,
      deletedCount: result.count,
    };
  }

  async bulkActivate(ids: string[], isActive: boolean) {
    if (ids.length > MAX_BULK_IDS) {
      throw new BadRequestException(`Maximum ${MAX_BULK_IDS} products per request`);
    }
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
    if (updates.length > MAX_BULK_IDS) {
      throw new BadRequestException(`Maximum ${MAX_BULK_IDS} updates per request`);
    }
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
    if (updates.length > MAX_BULK_IDS) {
      throw new BadRequestException(`Maximum ${MAX_BULK_IDS} updates per request`);
    }
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

  async importProducts(products: ImportProductDto[]) {
    if (products.length > MAX_IMPORT_PRODUCTS) {
      throw new BadRequestException(`Maximum ${MAX_IMPORT_PRODUCTS} products per import`);
    }
    const results = {
      created: 0,
      updated: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        const existing = product.sku
          ? await this.prisma.product.findUnique({ where: { sku: product.sku } })
          : await this.prisma.product.findUnique({ where: { slug: product.slug } });

        if (existing) {
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
}
