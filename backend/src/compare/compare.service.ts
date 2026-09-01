import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CompareService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
  ) {}

  async addToCompare(userId: string, productId: string) {
    // Проверяем, существует ли товар
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Проверяем, не добавлен ли уже товар в сравнение
    const existingItem = await this.prisma.compareItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingItem) {
      return this.prisma.compareItem.findUniqueOrThrow({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });
    }

    // Проверяем лимит сравнения (максимум 10 активных товаров)
    const compareCount = await this.prisma.compareItem.count({
      where: { userId, product: { isActive: true } },
    });

    if (compareCount >= 10) {
      throw new ConflictException('Maximum 10 products can be compared');
    }

    return this.prisma.compareItem.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async removeFromCompare(userId: string, productId: string) {
    const item = await this.prisma.compareItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Product not found in compare');
    }

    return this.prisma.compareItem.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
  }

  async getCompare(userId: string) {
    const items = await this.prisma.compareItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { productId: true },
    });
    const ids = items.map((i) => i.productId);
    const products = await this.productsService.findManyActiveByIdsForCompare(ids);
    const activeIds = new Set(products.map((p) => p.id));
    const orphanIds = ids.filter((id) => !activeIds.has(id));
    if (orphanIds.length > 0) {
      await this.prisma.compareItem.deleteMany({
        where: { userId, productId: { in: orphanIds } },
      });
    }
    return products;
  }

  async getCompareCount(userId: string) {
    return this.prisma.compareItem.count({
      where: { userId, product: { isActive: true } },
    });
  }

  async isInCompare(userId: string, productId: string): Promise<boolean> {
    const item = await this.prisma.compareItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return !!item;
  }

  async getCompareItems(userId: string) {
    return this.prisma.compareItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
