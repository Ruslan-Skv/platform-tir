import { BadRequestException, Injectable } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PublicCatalogService } from '../products/public-catalog/public-catalog.service';
import type { UpdateCatalogHubPreviewDto } from './dto/catalog-hub-preview.dto';

export type HubPreviewMode = 'featured' | 'new';

type CategoryWithChildren = Category & { children?: CategoryWithChildren[] };

type SectionWithRelations = {
  id: string;
  categoryId: string;
  sortOrder: number;
  isActive: boolean;
  category: Category;
  productPicks: Array<{
    id: string;
    productId: string;
    mode: string;
    sortOrder: number;
  }>;
};

const MAX_SECTIONS = 4;
const DEFAULT_PRODUCTS_PER_GROUP = 6;

@Injectable()
export class CatalogHubPreviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicCatalog: PublicCatalogService,
  ) {}

  async getPublicPreview(mode: HubPreviewMode = 'featured') {
    const settings = await this.getOrCreateSettings();
    let sections = await this.loadActiveSections();

    if (sections.length === 0) {
      sections = await this.buildDefaultSectionsFromRoots();
    }

    sections = sections.slice(0, MAX_SECTIONS);

    const resolved = await Promise.all(
      sections.map(async (section) => {
        const products = await this.resolveProductsForSection(
          section,
          mode,
          settings.productsPerGroup,
        );
        return {
          id: section.id,
          categoryId: section.category.id,
          categoryName: section.category.name,
          categorySlug: section.category.slug,
          viewAllUrl: `/catalog/products/${section.category.slug}`,
          products,
        };
      }),
    );

    return {
      mode,
      productsPerGroup: settings.productsPerGroup,
      sections: resolved.filter((s) => s.products.length > 0),
    };
  }

  async getAdminConfig() {
    const settings = await this.getOrCreateSettings();
    const sections = await this.prisma.catalogHubPreviewSection.findMany({
      where: { settingsId: 'main' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        productPicks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: { select: { id: true, name: true, sku: true, isActive: true } },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const availableCategories = await this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    });

    return {
      productsPerGroup: settings.productsPerGroup,
      availableCategories,
      sections: sections.map((section) => ({
        id: section.id,
        categoryId: section.categoryId,
        categoryName: section.category.name,
        categorySlug: section.category.slug,
        sortOrder: section.sortOrder,
        isActive: section.isActive,
        featuredProducts: section.productPicks
          .filter((p) => p.mode === 'featured')
          .map((p) => p.product),
        newProducts: section.productPicks.filter((p) => p.mode === 'new').map((p) => p.product),
      })),
    };
  }

  async updateConfig(dto: UpdateCatalogHubPreviewDto) {
    if (dto.sections.length > MAX_SECTIONS) {
      throw new BadRequestException(`Максимум ${MAX_SECTIONS} разделов в превью`);
    }

    const categoryIds = dto.sections.map((s) => s.categoryId);
    if (new Set(categoryIds).size !== categoryIds.length) {
      throw new BadRequestException('Категории в разделах не должны повторяться');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.catalogHubPreviewSettings.upsert({
        where: { id: 'main' },
        create: {
          id: 'main',
          productsPerGroup: dto.productsPerGroup ?? DEFAULT_PRODUCTS_PER_GROUP,
        },
        update: {
          ...(dto.productsPerGroup !== undefined && { productsPerGroup: dto.productsPerGroup }),
        },
      });

      await tx.catalogHubPreviewProductPick.deleteMany({
        where: { section: { settingsId: 'main' } },
      });
      await tx.catalogHubPreviewSection.deleteMany({ where: { settingsId: 'main' } });

      for (const [index, sectionDto] of dto.sections.entries()) {
        const section = await tx.catalogHubPreviewSection.create({
          data: {
            settingsId: 'main',
            categoryId: sectionDto.categoryId,
            sortOrder: sectionDto.sortOrder ?? index,
            isActive: sectionDto.isActive ?? true,
          },
        });

        const picks: Prisma.CatalogHubPreviewProductPickCreateManyInput[] = [];
        (sectionDto.featuredProductIds ?? []).forEach((productId, sortOrder) => {
          picks.push({ sectionId: section.id, productId, mode: 'featured', sortOrder });
        });
        (sectionDto.newProductIds ?? []).forEach((productId, sortOrder) => {
          picks.push({ sectionId: section.id, productId, mode: 'new', sortOrder });
        });

        if (picks.length > 0) {
          await tx.catalogHubPreviewProductPick.createMany({ data: picks });
        }
      }
    });

    return this.getAdminConfig();
  }

  private async getOrCreateSettings() {
    return this.prisma.catalogHubPreviewSettings.upsert({
      where: { id: 'main' },
      create: { id: 'main', productsPerGroup: DEFAULT_PRODUCTS_PER_GROUP },
      update: {},
    });
  }

  private async loadActiveSections(): Promise<SectionWithRelations[]> {
    return this.prisma.catalogHubPreviewSection.findMany({
      where: { settingsId: 'main', isActive: true },
      include: {
        category: true,
        productPicks: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private async buildDefaultSectionsFromRoots(): Promise<SectionWithRelations[]> {
    const roots = await this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      take: MAX_SECTIONS,
    });

    return roots.map((category, sortOrder) => ({
      id: `auto-${category.id}`,
      categoryId: category.id,
      sortOrder,
      isActive: true,
      category,
      productPicks: [],
    }));
  }

  private async resolveProductsForSection(
    section: SectionWithRelations,
    mode: HubPreviewMode,
    limit: number,
  ) {
    const pickIds = section.productPicks
      .filter((p) => p.mode === mode)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => p.productId);

    if (pickIds.length > 0) {
      const cards = await this.publicCatalog.getPublicCardsByIds(pickIds.slice(0, limit));
      return cards;
    }

    return this.autoSelectProducts(section.categoryId, mode, limit);
  }

  private async autoSelectProducts(categoryId: string, mode: HubPreviewMode, limit: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { children: { include: { children: true } } },
    });
    if (!category) return [];

    const categoryIds = this.collectCategoryIds(category as CategoryWithChildren);
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      mode === 'featured'
        ? [{ sortOrder: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.desc }]
        : [{ createdAt: Prisma.SortOrder.desc }];

    const primaryWhere: Prisma.ProductWhereInput = {
      categoryId: { in: categoryIds },
      isActive: true,
      ...(mode === 'featured' ? { isFeatured: true } : { isNew: true }),
    };

    let rows = await this.prisma.product.findMany({
      where: primaryWhere,
      select: { id: true },
      orderBy,
      take: limit,
    });

    if (rows.length < limit) {
      const excludeIds = rows.map((r) => r.id);
      const fallback = await this.prisma.product.findMany({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
          id: { notIn: excludeIds },
        },
        select: { id: true },
        orderBy: [{ sortOrder: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.desc }],
        take: limit - rows.length,
      });
      rows = [...rows, ...fallback];
    }

    return this.publicCatalog.getPublicCardsByIds(rows.map((r) => r.id));
  }

  private collectCategoryIds(category: CategoryWithChildren): string[] {
    const ids = [category.id];
    if (category.children?.length) {
      for (const child of category.children) {
        ids.push(...this.collectCategoryIds(child));
      }
    }
    return ids;
  }
}
