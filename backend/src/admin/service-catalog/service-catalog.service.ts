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
import { Prisma, ServiceCatalogCategory } from '@prisma/client';

type CategoryWithIncludes = ServiceCatalogCategory & {
  items: { price: Prisma.Decimal; [key: string]: unknown }[];
  _count: { items: number };
};

type CategoryTreeNode = CategoryWithIncludes & { children: CategoryTreeNode[] };

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
          title: 'Ремонт квартир',
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

  private buildCategoryTree(flat: CategoryWithIncludes[]): CategoryTreeNode[] {
    const map = new Map<string, CategoryTreeNode>();
    for (const c of flat) {
      map.set(c.id, { ...c, children: [] });
    }
    const roots: CategoryTreeNode[] = [];
    for (const c of flat) {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    const sortRec = (nodes: CategoryTreeNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      for (const n of nodes) sortRec(n.children);
    };
    sortRec(roots);
    return roots;
  }

  /** Подняться от nodeId к корню: если встретится possibleAncestorId — nodeId лежит в поддереве possibleAncestorId */
  private async isUnderAncestor(possibleAncestorId: string, nodeId: string): Promise<boolean> {
    let current: string | null = nodeId;
    for (let i = 0; i < 512 && current; i++) {
      if (current === possibleAncestorId) return true;
      const row: { parentId: string | null } | null =
        await this.prisma.serviceCatalogCategory.findUnique({
          where: { id: current },
          select: { parentId: true },
        });
      current = row?.parentId ?? null;
    }
    return false;
  }

  private async assertValidParentMove(categoryId: string, newParentId: string | null | undefined) {
    if (newParentId === undefined) return;
    if (newParentId === null) return;
    if (newParentId === categoryId) {
      throw new BadRequestException('Категория не может быть родителем самой себе');
    }
    await this.findCategoryById(newParentId);
    if (await this.isUnderAncestor(categoryId, newParentId)) {
      throw new BadRequestException('Нельзя сделать родителем свою подкатегорию');
    }
  }

  // --- Categories (admin) ---
  async createCategory(dto: CreateServiceCatalogCategoryDto) {
    const existing = await this.prisma.serviceCatalogCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Категория с slug "${dto.slug}" уже существует`);
    }
    if (dto.parentId) {
      await this.findCategoryById(dto.parentId);
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
        parentId: dto.parentId ?? null,
      },
      include: { _count: { select: { items: true } } },
    });
  }

  async findAllCategories(includeInactive = false) {
    const where: Prisma.ServiceCatalogCategoryWhereInput = {};
    if (!includeInactive) where.isActive = true;

    const flat = await this.prisma.serviceCatalogCategory.findMany({
      where,
      include: {
        _count: { select: { items: true } },
        items: includeInactive
          ? { orderBy: { sortOrder: 'asc' } }
          : { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return this.buildCategoryTree(flat as CategoryWithIncludes[]);
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
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { items: true } },
          },
        },
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
    if (dto.parentId !== undefined) {
      await this.assertValidParentMove(id, dto.parentId ?? null);
    }

    const data: Prisma.ServiceCatalogCategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.image !== undefined) data.image = dto.image;
    if (dto.showPricesInPublic !== undefined) data.showPricesInPublic = dto.showPricesInPublic;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        data.parent = { disconnect: true };
      } else {
        data.parent = { connect: { id: dto.parentId } };
      }
    }

    return this.prisma.serviceCatalogCategory.update({
      where: { id },
      data,
      include: { _count: { select: { items: true } } },
    });
  }

  async removeCategory(id: string) {
    await this.findCategoryById(id);
    const childCount = await this.prisma.serviceCatalogCategory.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new BadRequestException('Сначала удалите или перенесите дочерние категории');
    }
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

  private mapPublicItems(
    showPrices: boolean,
    items: {
      id: string;
      name: string;
      description: string | null;
      unit: string;
      sortOrder: number;
      price: Prisma.Decimal;
    }[],
  ) {
    return items.map((item) => {
      const base = {
        id: item.id,
        name: item.name,
        description: item.description,
        unit: item.unit,
        sortOrder: item.sortOrder,
      };
      if (showPrices) {
        return { ...base, price: Number(item.price) };
      }
      return base;
    });
  }

  private mapPublicCategoryTree(nodes: CategoryTreeNode[]): Record<string, unknown>[] {
    return nodes.map((c) => {
      const childMaps = this.mapPublicCategoryTree(c.children);
      const ownItems = this.mapPublicItems(
        c.showPricesInPublic,
        c.items as Parameters<typeof this.mapPublicItems>[1],
      );
      const childTotal = childMaps.reduce(
        (s, ch) => s + (typeof ch.totalWorkTypes === 'number' ? ch.totalWorkTypes : 0),
        0,
      );
      const totalWorkTypes = ownItems.length + childTotal;
      const out: Record<string, unknown> = {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        image: c.image,
        showPricesInPublic: c.showPricesInPublic,
        items: ownItems,
        totalWorkTypes,
      };
      if (childMaps.length > 0) {
        out.children = childMaps;
      }
      return out;
    });
  }

  async getPublicCatalog() {
    const block = await this.getBlock();
    const flat = await this.prisma.serviceCatalogCategory.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { items: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const tree = this.buildCategoryTree(flat as unknown as CategoryWithIncludes[]);

    return {
      block: {
        id: block.id,
        title: block.title,
      },
      categories: this.mapPublicCategoryTree(tree),
    };
  }

  async getPublicCategoryBySlug(slug: string) {
    const category = await this.findCategoryBySlug(slug);
    const items = this.mapPublicItems(category.showPricesInPublic, category.items);
    const children =
      category.children?.map((ch) => ({
        id: ch.id,
        name: ch.name,
        slug: ch.slug,
        description: ch.description,
        icon: ch.icon,
        image: ch.image,
        itemsCount: ch._count.items,
      })) ?? [];

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      image: category.image,
      items,
      showPricesInPublic: category.showPricesInPublic,
      parent: category.parent,
      children,
    };
  }

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
