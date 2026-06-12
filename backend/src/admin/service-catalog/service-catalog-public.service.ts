import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { serviceCatalogPriceWithMarkup } from '../../common/utils/service-catalog-price';
import {
  categoryRowsToMarkupMap,
  effectiveServiceCatalogMarkupPercent,
  loadServiceCatalogCategoryMarkupMap,
} from '../../common/utils/service-catalog-markup-effective';
import { ServiceCatalogBlockService } from './service-catalog-block.service';
import { ServiceCatalogCategoriesService } from './service-catalog-categories.service';
import {
  buildCategoryTree,
  CategoryTreeNode,
  CategoryWithIncludes,
  countActiveItemsInCategorySubtree,
  mapPublicCategoryTree,
  mapPublicItems,
  PublicCatalogItem,
} from './service-catalog-shared';

@Injectable()
export class ServiceCatalogPublicService {
  constructor(
    private prisma: PrismaService,
    private block: ServiceCatalogBlockService,
    private categories: ServiceCatalogCategoriesService,
  ) {}

  async getPublicCatalog() {
    const block = await this.block.getBlock();
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

    const tree = buildCategoryTree(flat as unknown as CategoryWithIncludes[]);
    const markupById = categoryRowsToMarkupMap(
      flat.map((c) => ({
        id: c.id,
        parentId: c.parentId,
        priceMarkupPercent: c.priceMarkupPercent,
      })),
    );

    return {
      block: {
        id: block.id,
        title: block.title,
      },
      categories: mapPublicCategoryTree(tree, markupById),
    };
  }

  async getPublicCategoryBySlug(slug: string) {
    const rootMeta = await this.prisma.serviceCatalogCategory.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        image: true,
        cardBackgroundImage: true,
        cardBackgroundTransparent: true,
        showPricesInPublic: true,
        parent: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!rootMeta) {
      throw new NotFoundException('Категория не найдена');
    }

    const subtreeIds = await this.categories.collectActiveSubtreeCategoryIds(rootMeta.id);
    const flat = await this.prisma.serviceCatalogCategory.findMany({
      where: { id: { in: subtreeIds }, isActive: true },
      include: {
        items: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { items: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const tree = buildCategoryTree(flat as CategoryWithIncludes[]);
    const rootNode = tree.find((n) => n.id === rootMeta.id);
    if (!rootNode) {
      throw new NotFoundException('Категория не найдена');
    }

    const markupById = categoryRowsToMarkupMap(
      flat.map((c) => ({
        id: c.id,
        parentId: c.parentId,
        priceMarkupPercent: c.priceMarkupPercent,
      })),
    );

    const itemSections: { name: string; slug: string; items: PublicCatalogItem[] }[] = [];
    const walk = (n: CategoryTreeNode) => {
      const mapped = mapPublicItems(
        n.showPricesInPublic,
        n.items as Parameters<typeof mapPublicItems>[1],
        effectiveServiceCatalogMarkupPercent(n.id, markupById),
      );
      if (mapped.length > 0) {
        itemSections.push({ name: n.name, slug: n.slug, items: mapped });
      }
      const kids = [...(n.children ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
      );
      for (const ch of kids) {
        walk(ch);
      }
    };
    walk(rootNode);

    const items = itemSections.flatMap((s) => s.items);

    const children =
      rootNode.children?.map((ch) => ({
        id: ch.id,
        name: ch.name,
        slug: ch.slug,
        description: ch.description,
        icon: ch.icon,
        image: ch.image,
        cardBackgroundImage: ch.cardBackgroundImage,
        cardBackgroundTransparent: ch.cardBackgroundTransparent,
        itemsCount: countActiveItemsInCategorySubtree(ch as CategoryTreeNode),
      })) ?? [];

    return {
      id: rootNode.id,
      name: rootNode.name,
      slug: rootNode.slug,
      description: rootNode.description,
      icon: rootNode.icon,
      image: rootNode.image,
      cardBackgroundImage: rootNode.cardBackgroundImage,
      cardBackgroundTransparent: rootNode.cardBackgroundTransparent,
      items,
      itemSections,
      showPricesInPublic: rootNode.showPricesInPublic,
      parent: rootMeta.parent,
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
        category: {
          select: {
            name: true,
            slug: true,
            showPricesInPublic: true,
            priceMarkupPercent: true,
          },
        },
      },
    });

    const markupMap = await loadServiceCatalogCategoryMarkupMap(this.prisma, [
      ...new Set(dbItems.map((i) => i.categoryId)),
    ]);

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
      const price = serviceCatalogPriceWithMarkup(
        item.price,
        effectiveServiceCatalogMarkupPercent(item.categoryId, markupMap),
      );
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
