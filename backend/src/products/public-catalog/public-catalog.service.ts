import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  CatalogCategoryFilterOptionDto,
  CatalogFilterFacetDto,
  CatalogFiltersResponseDto,
} from '../../catalog-filter-blocks/dto/public-filters.dto';
import type { PublicCatalogListParams } from '../dto/public-catalog-list.dto';
import { PublicCatalogCardsService } from './public-catalog-cards.service';
import { PublicCatalogQueryService } from './public-catalog-query.service';
import { DEFAULT_LIMIT, MAX_LIMIT } from './public-catalog-shared';

@Injectable()
export class PublicCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly query: PublicCatalogQueryService,
    private readonly cards: PublicCatalogCardsService,
  ) {}

  /** Список + faceted-фильтры одним запросом (для SSR). */
  async getPage(params: PublicCatalogListParams) {
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const page = Math.max(params.page ?? 1, 1);
    const prepared = await this.query.prepareCatalogData(params);

    if (!prepared) {
      return {
        category: {
          id: 'all',
          name: 'Каталог товаров',
          slug: 'all',
          description: 'Выберите категорию',
        },
        products: [],
        total: 0,
        page: 1,
        limit,
        totalPages: 0,
        priceRange: null,
        categoryFilterOptions: [] as CatalogCategoryFilterOptionDto[],
        filters: {
          branch: null,
          filters: [] as CatalogFilterFacetDto[],
          categoryFilterOptions: [] as CatalogCategoryFilterOptionDto[],
        } satisfies CatalogFiltersResponseDto,
      };
    }

    const [list, filters] = await Promise.all([
      this.query.buildListResult(prepared, params, page, limit),
      this.query.buildFiltersResult(prepared.ctx, params, prepared.baseRows),
    ]);

    return {
      ...list,
      filters,
    };
  }

  async list(params: PublicCatalogListParams) {
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const page = Math.max(params.page ?? 1, 1);
    const prepared = await this.query.prepareCatalogData(params);

    if (!prepared) {
      return {
        category: {
          id: 'all',
          name: 'Каталог товаров',
          slug: 'all',
          description: 'Выберите категорию',
        },
        products: [],
        total: 0,
        page: 1,
        limit,
        totalPages: 0,
        priceRange: null,
        categoryFilterOptions: [] as CatalogCategoryFilterOptionDto[],
      };
    }

    return this.query.buildListResult(prepared, params, page, limit);
  }

  /** Faceted-фильтры: counts с учётом активных фильтров (кроме текущего фасета). */
  async getFacetedFilters(params: PublicCatalogListParams): Promise<CatalogFiltersResponseDto> {
    const prepared = await this.query.prepareCatalogData(params);
    if (!prepared) {
      return { branch: null, filters: [], categoryFilterOptions: [] };
    }
    return this.query.buildFiltersResult(prepared.ctx, params, prepared.baseRows);
  }

  /** Лёгкие данные для sitemap.xml */
  async getSitemapData() {
    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({
        where: { isActive: true },
        select: {
          slug: true,
          updatedAt: true,
          parent: { select: { slug: true } },
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      categories: categories.map((c) => ({
        slug: c.slug,
        parentSlug: c.parent?.slug ?? null,
        updatedAt: c.updatedAt.toISOString(),
      })),
      products: products.map((p) => ({
        slug: p.slug,
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  /** Карточки товаров для публичного каталога в заданном порядке id. */
  async getPublicCardsByIds(orderedIds: string[]) {
    return this.cards.getPublicCardsByIds(orderedIds);
  }
}
