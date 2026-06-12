import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../database/prisma.service';
import { CreateServiceCatalogCategoryDto } from './dto/create-service-catalog-category.dto';
import { UpdateServiceCatalogCategoryDto } from './dto/update-service-catalog-category.dto';
import { buildCategoryTree, CategoryWithIncludes } from './service-catalog-shared';

@Injectable()
export class ServiceCatalogCategoriesService {
  constructor(private prisma: PrismaService) {}

  async collectActiveSubtreeCategoryIds(rootId: string): Promise<string[]> {
    const out = new Set<string>([rootId]);
    let frontier = [rootId];
    for (let depth = 0; depth < 64 && frontier.length > 0; depth++) {
      const rows = await this.prisma.serviceCatalogCategory.findMany({
        where: { parentId: { in: frontier }, isActive: true },
        select: { id: true },
      });
      frontier = [];
      for (const row of rows) {
        if (!out.has(row.id)) {
          out.add(row.id);
          frontier.push(row.id);
        }
      }
    }
    return [...out];
  }

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
        cardBackgroundImage: dto.cardBackgroundImage ?? null,
        cardBackgroundTransparent: dto.cardBackgroundTransparent ?? false,
        priceMarkupPercent: new Prisma.Decimal(dto.priceMarkupPercent ?? 0),
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
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return buildCategoryTree(flat as CategoryWithIncludes[]);
  }

  async reorderCategoryAmongSiblings(
    categoryId: string,
    direction: 'up' | 'down',
    includeInactive = true,
  ) {
    const activeWhere: Prisma.ServiceCatalogCategoryWhereInput = includeInactive
      ? {}
      : { isActive: true };

    const cat = await this.prisma.serviceCatalogCategory.findFirst({
      where: { id: categoryId, ...activeWhere },
      select: { id: true, parentId: true },
    });
    if (!cat) {
      throw new NotFoundException('Категория не найдена');
    }

    const parentKey = cat.parentId;
    const siblingParentFilter: Prisma.ServiceCatalogCategoryWhereInput =
      parentKey === null ? { parentId: null } : { parentId: parentKey };

    const siblings = await this.prisma.serviceCatalogCategory.findMany({
      where: { ...siblingParentFilter, ...activeWhere },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    const idx = siblings.findIndex((s) => s.id === categoryId);
    if (idx < 0) {
      throw new BadRequestException('Категория не входит в список соседей по данным БД');
    }
    const j = direction === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= siblings.length) {
      return this.findAllCategories(includeInactive);
    }

    const orderIds = siblings.map((s) => s.id);
    const tmp = orderIds[idx];
    orderIds[idx] = orderIds[j];
    orderIds[j] = tmp;

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < orderIds.length; i++) {
        await tx.serviceCatalogCategory.update({
          where: { id: orderIds[i] },
          data: { sortOrder: i },
        });
      }
    });

    return this.findAllCategories(includeInactive);
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
    if (dto.cardBackgroundImage !== undefined) data.cardBackgroundImage = dto.cardBackgroundImage;
    if (dto.cardBackgroundTransparent !== undefined) {
      data.cardBackgroundTransparent = dto.cardBackgroundTransparent;
    }
    if (dto.showPricesInPublic !== undefined) data.showPricesInPublic = dto.showPricesInPublic;
    if (dto.priceMarkupPercent !== undefined) {
      data.priceMarkupPercent = new Prisma.Decimal(dto.priceMarkupPercent);
    }
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
    const existing = await this.findCategoryById(id);
    await this.assertCategorySubtreeHasNoBlockingOrderLines(id);

    try {
      await this.prisma.$transaction(async (tx) => {
        const removeRecursive = async (categoryId: string) => {
          const children = await tx.serviceCatalogCategory.findMany({
            where: { parentId: categoryId },
            select: { id: true },
            orderBy: { sortOrder: 'asc' },
          });
          for (const ch of children) {
            await removeRecursive(ch.id);
          }
          await tx.serviceCatalogCategory.delete({ where: { id: categoryId } });
        };
        await removeRecursive(id);
      });
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      if (
        e instanceof PrismaClientKnownRequestError &&
        (e.code === 'P2003' || e.code === 'P2014')
      ) {
        throw new BadRequestException(
          'Не удалось удалить категорию: остались связи с заказами или другими данными (возможна гонка при параллельном изменении). Обновите страницу и проверьте заказы.',
        );
      }
      throw e;
    }

    return existing;
  }

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

  private async collectSubtreeCategoryIds(rootId: string): Promise<string[]> {
    const ids = [rootId];
    const children = await this.prisma.serviceCatalogCategory.findMany({
      where: { parentId: rootId },
      select: { id: true },
    });
    for (const { id } of children) {
      ids.push(...(await this.collectSubtreeCategoryIds(id)));
    }
    return ids;
  }

  private async assertCategorySubtreeHasNoBlockingOrderLines(
    rootCategoryId: string,
  ): Promise<void> {
    const categoryIds = await this.collectSubtreeCategoryIds(rootCategoryId);
    const itemIds = (
      await this.prisma.serviceCatalogItem.findMany({
        where: { categoryId: { in: categoryIds } },
        select: { id: true },
      })
    ).map((r) => r.id);
    if (itemIds.length === 0) return;

    const [serviceOrderLines, orderLines] = await Promise.all([
      this.prisma.serviceOrderItem.count({
        where: { serviceCatalogItemId: { in: itemIds } },
      }),
      this.prisma.orderServiceItem.count({
        where: { serviceCatalogItemId: { in: itemIds } },
      }),
    ]);
    const total = serviceOrderLines + orderLines;
    if (total > 0) {
      throw new BadRequestException(
        `Нельзя удалить категорию: по видам работ из этой ветки есть ${total} связанных строк в заказах (услуги уже были в заказах). Удалите или измените эти заказы либо скорректируйте позиции, затем повторите удаление.`,
      );
    }
  }
}
