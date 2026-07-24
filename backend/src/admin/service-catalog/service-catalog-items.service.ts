import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { serviceCatalogPriceWithMarkup } from '../../common/utils/service-catalog-price';
import {
  effectiveServiceCatalogMarkupPercent,
  loadServiceCatalogCategoryMarkupMap,
} from '../../common/utils/service-catalog-markup-effective';
import { CreateServiceCatalogItemDto } from './dto/create-service-catalog-item.dto';
import { UpdateServiceCatalogItemDto } from './dto/update-service-catalog-item.dto';
import { ServiceCatalogCategoriesService } from './service-catalog-categories.service';

@Injectable()
export class ServiceCatalogItemsService {
  constructor(
    private prisma: PrismaService,
    private categories: ServiceCatalogCategoriesService,
  ) {}

  async createItem(dto: CreateServiceCatalogItemDto) {
    await this.categories.findCategoryById(dto.categoryId);

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const agg = await this.prisma.serviceCatalogItem.aggregate({
        where: { categoryId: dto.categoryId },
        _max: { sortOrder: true },
      });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    const created = await this.prisma.serviceCatalogItem.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: new Prisma.Decimal(dto.price),
        unit: dto.unit ?? 'м²',
        sortOrder,
        isActive: dto.isActive ?? true,
      },
    });
    return this.findItemById(created.id);
  }

  async findAllItems(params?: { categoryId?: string; page?: number; limit?: number }) {
    const { categoryId, page = 1, limit = 100 } = params ?? {};
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceCatalogItemWhereInput = {};
    if (categoryId) where.categoryId = categoryId;

    const [items, total] = await Promise.all([
      this.prisma.serviceCatalogItem.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
              priceMarkupPercent: true,
            },
          },
        },
        orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.serviceCatalogItem.count({ where }),
    ]);

    const markupMap = await loadServiceCatalogCategoryMarkupMap(this.prisma, [
      ...new Set(items.map((i) => i.categoryId)),
    ]);

    return {
      data: items.map((item) => ({
        ...item,
        priceWithMarkup: serviceCatalogPriceWithMarkup(
          item.price,
          effectiveServiceCatalogMarkupPercent(item.categoryId, markupMap),
        ),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findItemById(id: string) {
    const item = await this.prisma.serviceCatalogItem.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
    if (!item) {
      throw new NotFoundException('Вид работ не найден');
    }
    const markupMap = await loadServiceCatalogCategoryMarkupMap(this.prisma, [item.categoryId]);
    const basePrice = Number(item.price);
    return {
      ...item,
      basePrice,
      priceWithMarkup: serviceCatalogPriceWithMarkup(
        item.price,
        effectiveServiceCatalogMarkupPercent(item.categoryId, markupMap),
      ),
    };
  }

  async updateItem(id: string, dto: UpdateServiceCatalogItemDto) {
    await this.findItemById(id);
    if (dto.categoryId) {
      await this.categories.findCategoryById(dto.categoryId);
    }
    const data: Prisma.ServiceCatalogItemUpdateInput = { ...dto };
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);

    await this.prisma.serviceCatalogItem.update({
      where: { id },
      data,
    });
    return this.findItemById(id);
  }

  async removeItem(id: string) {
    const row = await this.prisma.serviceCatalogItem.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Вид работ не найден');
    }
    return this.prisma.serviceCatalogItem.delete({
      where: { id },
    });
  }
}
