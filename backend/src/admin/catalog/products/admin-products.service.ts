import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

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
                legalName: true,
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

    // Явно удаляем связи с поставщиками перед удалением товаров
    // Это гарантирует, что счетчики обновятся корректно
    await this.prisma.productSupplier.deleteMany({
      where: { productId: { in: ids } },
    });

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

  // Import from file (XLS/HTML Bitrix format)
  async importFromFile(
    fileBuffer: Buffer,
    filename: string,
    categoryId: string,
    skuPrefix?: string,
  ) {
    // Check category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException('Категория не найдена');
    }

    const html = fileBuffer.toString('utf-8');
    const products = this.parseHtmlTable(html, skuPrefix || 'IMPORT');

    if (products.length === 0) {
      throw new BadRequestException('Не удалось найти товары в файле. Проверьте формат файла.');
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as { name: string; error: string }[],
      totalFound: products.length,
    };

    for (const product of products) {
      try {
        const existing = await this.prisma.product.findFirst({
          where: {
            OR: [{ sku: product.sku }, { slug: product.slug }],
          },
        });

        if (existing) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: {
              name: product.name,
              description: product.description,
              price: new Prisma.Decimal(product.price),
              images: product.images,
              attributes: product.attributes as Prisma.InputJsonValue,
              isActive: true,
              isFeatured: product.isFeatured,
            },
          });
          results.updated++;
        } else {
          await this.prisma.product.create({
            data: {
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              description: product.description,
              price: new Prisma.Decimal(product.price),
              stock: 10,
              categoryId,
              images: product.images,
              attributes: product.attributes as Prisma.InputJsonValue,
              isActive: true,
              isFeatured: product.isFeatured,
            },
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          name: product.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  // Parse HTML table from Bitrix export
  private parseHtmlTable(html: string, skuPrefix: string) {
    interface ParsedProduct {
      name: string;
      slug: string;
      sku: string;
      price: number;
      description: string;
      images: string[];
      attributes: Record<string, unknown>;
      isFeatured: boolean;
    }

    const products: ParsedProduct[] = [];
    const rows = html.split('</tr>');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row.includes('<td>') && !row.includes('<td ')) continue;

      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let match;

      while ((match = cellRegex.exec(row)) !== null) {
        const value = match[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(value);
      }

      if (cells.length < 10) continue;
      if (cells[0] === 'Название' || cells[0] === 'ID' || cells[0] === '') continue;

      // Try to parse as Bitrix format
      const name = cells[0];
      const isActive =
        cells[1] === 'Да' || cells[1] === 'да' || cells[1] === 'Y' || cells[1] === '1';

      if (!name || !isActive) continue;

      // Find price (usually a number > 1000)
      let price = 0;
      let priceIdx = -1;
      for (let j = 2; j < cells.length; j++) {
        const num = parseInt(cells[j].replace(/[^\d]/g, ''), 10);
        if (num >= 1000) {
          price = num;
          priceIdx = j;
          break;
        }
      }

      if (price === 0) continue;

      // Generate slug
      const slug = name
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);

      // Generate SKU
      const externalId = cells[4] || String(i);
      const sku = `${skuPrefix}-${externalId.replace(/[^\d]/g, '') || i}`;

      // Collect images
      const images: string[] = [];
      for (const cell of cells) {
        if (
          cell.includes('http') &&
          (cell.includes('.jpg') ||
            cell.includes('.png') ||
            cell.includes('.jpeg') ||
            cell.includes('.webp'))
        ) {
          const urls = cell.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp|gif)/gi);
          if (urls) {
            images.push(...urls);
          }
        }
      }

      // Description (usually longer text)
      let description = '';
      for (const cell of cells) {
        if (cell.length > 100 && !cell.includes('http')) {
          description = cell;
          break;
        }
      }

      // Attributes from remaining cells
      const attributes: Record<string, string> = {};
      const attributeNames = ['sizes', 'manufacturer', 'color', 'coating', 'thickness', 'material'];
      let attrIdx = 0;
      for (let j = priceIdx + 1; j < cells.length && attrIdx < attributeNames.length; j++) {
        if (
          cells[j] &&
          cells[j].length > 0 &&
          cells[j].length < 200 &&
          !cells[j].includes('http')
        ) {
          attributes[attributeNames[attrIdx]] = cells[j];
          attrIdx++;
        }
      }

      // Check for featured flags
      const isFeatured = cells.some((c) => c === 'Да' && cells.indexOf(c) > priceIdx);

      products.push({
        name,
        slug,
        sku,
        price,
        description,
        images: [...new Set(images)].slice(0, 10),
        attributes,
        isFeatured,
      });
    }

    return products;
  }

  // Preview import file from local path
  async previewImportFile(filePath: string) {
    const importDir = path.join(process.cwd(), 'import-bitriks');
    const files: string[] = [];

    try {
      const dirContents = fs.readdirSync(importDir);
      for (const file of dirContents) {
        if (
          file.endsWith('.xls') ||
          file.endsWith('.xlsx') ||
          file.endsWith('.html') ||
          file.endsWith('.htm')
        ) {
          files.push(file);
        }
      }
    } catch {
      // Directory doesn't exist
    }

    if (filePath) {
      const fullPath = path.join(importDir, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const products = this.parseHtmlTable(content, 'PREVIEW');
        return {
          files,
          preview: {
            file: filePath,
            totalProducts: products.length,
            samples: products.slice(0, 5).map((p) => ({
              name: p.name,
              price: p.price,
              sku: p.sku,
              imagesCount: p.images.length,
            })),
          },
        };
      }
    }

    return { files, preview: null };
  }
}
