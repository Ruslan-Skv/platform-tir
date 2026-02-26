import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateServiceCatalogCategoryDto } from './dto/create-service-catalog-category.dto';
import { UpdateServiceCatalogCategoryDto } from './dto/update-service-catalog-category.dto';
import { CreateServiceCatalogItemDto } from './dto/create-service-catalog-item.dto';
import { UpdateServiceCatalogItemDto } from './dto/update-service-catalog-item.dto';
import { UpdateServiceCatalogBlockDto } from './dto/update-service-catalog-block.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServiceCatalogService {
  constructor(private prisma: PrismaService) {}

  // --- Block ---
  async getBlock() {
    let block = await this.prisma.serviceCatalogBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      block = await this.prisma.serviceCatalogBlock.create({
        data: {
          id: 'main',
          title: 'Каталог услуг',
          showPricesInPublic: true,
        },
      });
    }
    return block;
  }

  async updateBlock(dto: UpdateServiceCatalogBlockDto) {
    await this.getBlock();
    return this.prisma.serviceCatalogBlock.update({
      where: { id: 'main' },
      data: dto,
    });
  }

  // --- Categories (admin) ---
  async createCategory(dto: CreateServiceCatalogCategoryDto) {
    const existing = await this.prisma.serviceCatalogCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Категория с slug "${dto.slug}" уже существует`);
    }
    return this.prisma.serviceCatalogCategory.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        icon: dto.icon ?? null,
        image: dto.image ?? null,
        showPricesInPublic: dto.showPricesInPublic ?? true,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: { _count: { select: { items: true } } },
    });
  }

  async findAllCategories(includeInactive = false) {
    const where: Prisma.ServiceCatalogCategoryWhereInput = {};
    if (!includeInactive) where.isActive = true;

    return this.prisma.serviceCatalogCategory.findMany({
      where,
      include: {
        _count: { select: { items: true } },
        items: includeInactive
          ? { orderBy: { sortOrder: 'asc' } }
          : { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findCategoryById(id: string) {
    const cat = await this.prisma.serviceCatalogCategory.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!cat) {
      throw new NotFoundException('Категория не найдена');
    }
    return cat;
  }

  async findCategoryBySlug(slug: string) {
    const cat = await this.prisma.serviceCatalogCategory.findUnique({
      where: { slug, isActive: true },
      include: {
        items: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!cat) {
      throw new NotFoundException('Категория не найдена');
    }
    return cat;
  }

  async updateCategory(id: string, dto: UpdateServiceCatalogCategoryDto) {
    await this.findCategoryById(id);
    if (dto.slug) {
      const existing = await this.prisma.serviceCatalogCategory.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Категория с slug "${dto.slug}" уже существует`);
      }
    }
    return this.prisma.serviceCatalogCategory.update({
      where: { id },
      data: dto,
      include: { _count: { select: { items: true } } },
    });
  }

  async removeCategory(id: string) {
    await this.findCategoryById(id);
    return this.prisma.serviceCatalogCategory.delete({
      where: { id },
    });
  }

  // --- Items (admin) ---
  async createItem(dto: CreateServiceCatalogItemDto) {
    await this.findCategoryById(dto.categoryId);
    return this.prisma.serviceCatalogItem.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: new Prisma.Decimal(dto.price),
        unit: dto.unit ?? 'м²',
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
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
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.serviceCatalogItem.count({ where }),
    ]);

    return {
      data: items,
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
    return item;
  }

  async updateItem(id: string, dto: UpdateServiceCatalogItemDto) {
    await this.findItemById(id);
    if (dto.categoryId) {
      await this.findCategoryById(dto.categoryId);
    }
    const data: Prisma.ServiceCatalogItemUpdateInput = { ...dto };
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);

    return this.prisma.serviceCatalogItem.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async removeItem(id: string) {
    await this.findItemById(id);
    return this.prisma.serviceCatalogItem.delete({
      where: { id },
    });
  }

  // --- Public ---
  async getPublicCatalog() {
    const block = await this.getBlock();
    const categories = await this.prisma.serviceCatalogCategory.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      block: {
        id: block.id,
        title: block.title,
      },
      categories: categories.map((c) => ({
        ...c,
        showPricesInPublic: c.showPricesInPublic,
        items: c.items.map((item) => {
          const base = {
            id: item.id,
            name: item.name,
            description: item.description,
            unit: item.unit,
            sortOrder: item.sortOrder,
          };
          if (c.showPricesInPublic) {
            return { ...base, price: Number(item.price) };
          }
          return base;
        }),
      })),
    };
  }

  async getPublicCategoryBySlug(slug: string) {
    const category = await this.findCategoryBySlug(slug);
    const items = category.items.map((item) => {
      const base = {
        id: item.id,
        name: item.name,
        description: item.description,
        unit: item.unit,
        sortOrder: item.sortOrder,
      };
      if (category.showPricesInPublic) {
        return { ...base, price: Number(item.price) };
      }
      return base;
    });
    return {
      ...category,
      items,
      showPricesInPublic: category.showPricesInPublic,
    };
  }

  // --- Расчёт стоимости ---
  async calculateTotal(items: { itemId: string; quantity: number }[]) {
    if (!items.length) {
      return { total: 0, lines: [], showPricesInPublic: false };
    }

    const ids = items.map((i) => i.itemId);
    const dbItems = await this.prisma.serviceCatalogItem.findMany({
      where: { id: { in: ids }, isActive: true },
      include: {
        category: { select: { name: true, slug: true, showPricesInPublic: true } },
      },
    });

    const idToItem = new Map(dbItems.map((i) => [i.id, i]));
    const lines: {
      itemId: string;
      name: string;
      categoryName: string;
      unit: string;
      quantity: number;
      price: number;
      amount: number;
    }[] = [];
    let total = 0;
    let anyCategoryShowsPrices = false;

    for (const { itemId, quantity } of items) {
      const item = idToItem.get(itemId);
      if (!item) {
        throw new BadRequestException(`Вид работ с id "${itemId}" не найден`);
      }
      if (item.category.showPricesInPublic) {
        anyCategoryShowsPrices = true;
      }
      const price = Number(item.price);
      const amount = price * quantity;
      total += amount;
      lines.push({
        itemId: item.id,
        name: item.name,
        categoryName: item.category.name,
        unit: item.unit,
        quantity,
        price,
        amount,
      });
    }

    return {
      total,
      lines,
      showPricesInPublic: anyCategoryShowsPrices,
    };
  }
}
