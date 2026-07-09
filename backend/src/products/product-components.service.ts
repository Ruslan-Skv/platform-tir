import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ComponentCatalogKindsService } from './services/component-catalog-kinds.service';
import { CreateProductComponentDto } from './dto/create-product-component.dto';
import { UpdateProductComponentDto } from './dto/update-product-component.dto';
import { LinkProductComponentDto } from './dto/link-product-component.dto';
import {
  buildComponentLabel,
  formatComponentType,
  resolveProductComponent,
  resolveProductComponents,
  type ComponentKindSettingsMap,
} from './utils/component-catalog-resolve.util';
import { calculateKitPrice } from './utils/component-kit-price.util';

const componentInclude = {
  catalogItem: {
    include: {
      kindRef: {
        select: {
          id: true,
          code: true,
          name: true,
          kitQuantity: true,
          quantityStep: true,
        },
      },
    },
  },
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
    },
  },
} as const;

@Injectable()
export class ProductComponentsService {
  constructor(
    private prisma: PrismaService,
    private kindsService: ComponentCatalogKindsService,
  ) {}

  private mapRow(
    row: Awaited<ReturnType<typeof this.fetchComponent>>,
    settings: ComponentKindSettingsMap,
  ) {
    return resolveProductComponent(row, settings);
  }

  private mapRows(
    rows: Awaited<ReturnType<typeof this.fetchComponents>>,
    settings: ComponentKindSettingsMap,
  ) {
    return resolveProductComponents(rows, settings);
  }

  private async fetchComponent(id: string) {
    const component = await this.prisma.productComponent.findUnique({
      where: { id },
      include: componentInclude,
    });
    if (!component) {
      throw new NotFoundException(`ProductComponent with ID ${id} not found`);
    }
    return component;
  }

  private async fetchComponents(where: Prisma.ProductComponentWhereInput) {
    return this.prisma.productComponent.findMany({
      where,
      include: componentInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(productId: string, createDto: CreateProductComponentDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (createDto.catalogItemId) {
      return this.linkCatalogItem(productId, {
        catalogItemId: createDto.catalogItemId,
        sortOrder: createDto.sortOrder,
        isActive: createDto.isActive,
      });
    }

    const row = await this.prisma.productComponent.create({
      data: {
        productId,
        name: createDto.name!,
        type: createDto.type!,
        price: createDto.price!,
        image: createDto.image,
        stock: createDto.stock ?? 0,
        isActive: createDto.isActive ?? true,
        sortOrder: createDto.sortOrder ?? 0,
      },
      include: componentInclude,
    });
    const settings = await this.kindsService.getMap();
    return this.mapRow(row, settings);
  }

  async linkCatalogItem(productId: string, dto: LinkProductComponentDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const catalogItem = await this.prisma.componentCatalogItem.findUnique({
      where: { id: dto.catalogItemId },
    });
    if (!catalogItem) {
      throw new NotFoundException(`Позиция справочника ${dto.catalogItemId} не найдена`);
    }

    const existing = await this.prisma.productComponent.findFirst({
      where: { productId, catalogItemId: dto.catalogItemId },
    });
    if (existing) {
      throw new ConflictException('Эта комплектующая уже привязана к товару');
    }

    const row = await this.prisma.productComponent.create({
      data: {
        productId,
        catalogItemId: catalogItem.id,
        name: catalogItem.name,
        type: formatComponentType(catalogItem.size, ''),
        price: catalogItem.price,
        image: catalogItem.image,
        stock: catalogItem.stock,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? catalogItem.sortOrder,
      },
      include: componentInclude,
    });
    const settings = await this.kindsService.getMap();
    return this.mapRow(row, settings);
  }

  async linkCatalogItemsBatch(productId: string, catalogItemIds: string[]) {
    const results = [];
    for (const catalogItemId of catalogItemIds) {
      try {
        const row = await this.linkCatalogItem(productId, { catalogItemId });
        results.push(row);
      } catch (error) {
        if (error instanceof ConflictException) continue;
        throw error;
      }
    }
    return results;
  }

  async linkCatalogGroup(productId: string, groupId: string) {
    const group = await this.prisma.componentCatalogGroup.findUnique({
      where: { id: groupId },
      include: {
        items: { orderBy: { sortOrder: 'asc' }, select: { catalogItemId: true } },
      },
    });
    if (!group) {
      throw new NotFoundException(`Группа комплектующих ${groupId} не найдена`);
    }
    const catalogItemIds = group.items.map((i: { catalogItemId: string }) => i.catalogItemId);
    if (!catalogItemIds.length) {
      throw new ConflictException('В группе нет комплектующих');
    }
    return this.linkCatalogItemsBatch(productId, catalogItemIds);
  }

  async findAll(productId?: string) {
    const baseWhere = productId ? { productId } : {};
    const where = {
      ...baseWhere,
      isActive: true,
      OR: [{ catalogItemId: null }, { catalogItem: { isActive: true } }],
    };
    const rows = await this.fetchComponents(where);
    const settings = await this.kindsService.getMap();
    return this.mapRows(rows, settings).filter((c) => c.isActive);
  }

  async findAllAdmin(productId?: string) {
    const where = productId ? { productId } : {};
    const rows = await this.fetchComponents(where);
    const settings = await this.kindsService.getMap();
    return this.mapRows(rows, settings);
  }

  async findOne(id: string) {
    const row = await this.fetchComponent(id);
    const settings = await this.kindsService.getMap();
    return this.mapRow(row, settings);
  }

  async update(id: string, updateDto: UpdateProductComponentDto) {
    const row = await this.fetchComponent(id);

    if (row.catalogItemId && (updateDto.price != null || updateDto.name || updateDto.type)) {
      throw new ConflictException(
        'Цена и наименование задаются в справочнике комплектующих. Измените позицию в каталоге.',
      );
    }

    const updated = await this.prisma.productComponent.update({
      where: { id },
      data: updateDto,
      include: componentInclude,
    });
    const settings = await this.kindsService.getMap();
    return this.mapRow(updated, settings);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.productComponent.delete({ where: { id } });
    return { success: true };
  }

  async findByProductId(productId: string) {
    const rows = await this.fetchComponents({
      productId,
      isActive: true,
      OR: [{ catalogItemId: null }, { catalogItem: { isActive: true } }],
    });
    const settings = await this.kindsService.getMap();
    return this.mapRows(rows, settings).filter((c) => c.isActive);
  }

  async getKitPriceForProduct(productId: string, canvasPriceOverride?: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, price: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    const components = await this.findByProductId(productId);
    const canvasPrice = canvasPriceOverride ?? parseFloat(product.price.toString());
    return calculateKitPrice(canvasPrice, components);
  }

  async getKitPriceBySlug(slug: string, canvasPriceOverride?: number) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true, price: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }
    return this.getKitPriceForProduct(product.id, canvasPriceOverride);
  }

  /** Все id категории + потомков (рекурсивно по parentId) */
  private async getCategoryIdsIncludingDescendants(rootId: string): Promise<string[]> {
    const result: string[] = [];
    const walk = async (id: string) => {
      result.push(id);
      const children = await this.prisma.category.findMany({
        where: { parentId: id },
        select: { id: true },
      });
      for (const ch of children) {
        await walk(ch.id);
      }
    };
    await walk(rootId);
    return result;
  }

  async getComponentNamesByCategoryId(
    categoryId: string,
    options?: { includeSubtree?: boolean },
  ): Promise<string[]> {
    const categoryIds =
      options?.includeSubtree === true
        ? await this.getCategoryIdsIncludingDescendants(categoryId)
        : [categoryId];

    const [legacy, catalog] = await Promise.all([
      this.prisma.productComponent.findMany({
        where: { product: { categoryId: { in: categoryIds } } },
        select: { name: true },
      }),
      this.prisma.componentCatalogItem.findMany({
        where: { isActive: true },
        select: { name: true },
      }),
    ]);

    const names = new Set<string>();
    for (const c of legacy) if (c.name) names.add(c.name);
    for (const c of catalog) if (c.name) names.add(c.name);
    return [...names].sort();
  }

  buildOrderComponentLabel(component: ReturnType<typeof resolveProductComponent>): string {
    return buildComponentLabel({
      name: component.name,
      size: component.size,
      color: component.color,
      material: component.material,
    });
  }
}
