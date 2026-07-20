import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ElasticsearchService } from '../../elasticsearch/elasticsearch.service';
import { CatalogFilterBlocksService } from '../../catalog-filter-blocks/catalog-filter-blocks.service';
import type {
  CatalogFilterFacetDto,
  CatalogFiltersResponseDto,
} from '../../catalog-filter-blocks/dto/public-filters.dto';
import type { PublicCatalogListParams } from '../dto/public-catalog-list.dto';
import { PublicCatalogCardsService } from './public-catalog-cards.service';
import { PublicCatalogFiltersService } from './public-catalog-filters.service';
import {
  CATALOG_SEARCH_MAX,
  CatalogContext,
  CatalogFilterRow,
  CategoryWithChildren,
  collectCategoryIds,
  resolveEffectiveCategorySlug,
} from './public-catalog-shared';

export type PreparedCatalogData = {
  ctx: CatalogContext;
  baseRows: CatalogFilterRow[];
  priceRange: { min: number; max: number } | null;
  searchRelevanceOrder: string[] | null;
};

@Injectable()
export class PublicCatalogQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly elasticsearch: ElasticsearchService,
    private readonly catalogFilterBlocks: CatalogFilterBlocksService,
    private readonly filters: PublicCatalogFiltersService,
    private readonly cards: PublicCatalogCardsService,
  ) {}

  async prepareCatalogData(params: PublicCatalogListParams): Promise<PreparedCatalogData | null> {
    const effectiveSlug = resolveEffectiveCategorySlug(params);
    if (!effectiveSlug) return null;

    const category = await this.prisma.category.findUnique({
      where: { slug: effectiveSlug },
      include: {
        children: {
          orderBy: [{ name: 'asc' }],
          include: {
            children: { orderBy: [{ name: 'asc' }] },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${effectiveSlug} not found`);
    }

    const allCategoryIds = collectCategoryIds(category as CategoryWithChildren);

    const priceRangeAgg = await this.prisma.product.aggregate({
      where: { categoryId: { in: allCategoryIds }, isActive: true },
      _min: { price: true },
      _max: { price: true },
    });
    const priceRange =
      priceRangeAgg._min.price != null && priceRangeAgg._max.price != null
        ? {
            min: Math.floor(Number(priceRangeAgg._min.price)),
            max: Math.ceil(Number(priceRangeAgg._max.price)),
          }
        : null;

    const { rows: baseRows, searchRelevanceOrder } = await this.loadFilterRows(
      allCategoryIds,
      params,
    );

    return {
      ctx: {
        category: category as CategoryWithChildren,
        effectiveSlug,
        allCategoryIds,
      },
      baseRows,
      priceRange,
      searchRelevanceOrder,
    };
  }

  async buildListResult(
    prepared: PreparedCatalogData,
    params: PublicCatalogListParams,
    page: number,
    limit: number,
  ) {
    const { ctx, baseRows, priceRange, searchRelevanceOrder } = prepared;
    const { category } = ctx;

    const facets = await this.filters.loadAttributeFacets(ctx.effectiveSlug);
    const filtered = this.filters.filterRowsForList(baseRows, params, facets);

    const rowsForCatFacet = this.filters.applyCrossFilters(baseRows, params, facets, {
      excludeCat: true,
    });
    const categoryFilterOptions = this.filters.buildCategoryFilterOptionsFromRows(
      category,
      rowsForCatFacet,
    );

    const sort = params.sort ?? 'default';
    const sorted = await this.filters.sortFilterRows(filtered, sort, searchRelevanceOrder);
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit) || 0;
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const skip = (safePage - 1) * limit;
    const pageIds = sorted.slice(skip, skip + limit).map((p) => p.id);

    const products = pageIds.length > 0 ? await this.cards.loadPublicCardsByIds(pageIds) : [];

    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
      products,
      total,
      page: safePage,
      limit,
      totalPages,
      priceRange,
      categoryFilterOptions,
    };
  }

  async buildFiltersResult(
    ctx: CatalogContext,
    params: PublicCatalogListParams,
    baseRows: CatalogFilterRow[],
  ): Promise<CatalogFiltersResponseDto> {
    const facets = await this.filters.loadAttributeFacets(ctx.effectiveSlug);
    const rowsForCatFacet = this.filters.applyCrossFilters(baseRows, params, facets, {
      excludeCat: true,
    });
    const categoryFilterOptions = this.filters.buildCategoryFilterOptionsFromRows(
      ctx.category,
      rowsForCatFacet,
    );

    const block = await this.catalogFilterBlocks.resolveMatchingBlock(ctx.category.id);
    if (!block) {
      return { branch: null, filters: [], categoryFilterOptions };
    }

    const filters: CatalogFilterFacetDto[] = [];
    for (const item of block.items) {
      const rowsForFacet = this.filters.applyCrossFiltersForBlockItem(
        baseRows,
        params,
        facets,
        item,
      );
      const facet = this.catalogFilterBlocks.buildFacetFromBlockItem(item, rowsForFacet);
      if (facet) filters.push(facet);
    }

    return { branch: block.id, filters, categoryFilterOptions };
  }

  private async elasticsearchSearchIds(
    query: string,
    categoryIds: string[],
  ): Promise<string[] | null> {
    if (!this.elasticsearch.isAvailable()) return null;
    const term = query.trim();
    if (!term) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any[] = [{ term: { isActive: true } }];
    if (categoryIds.length > 0) {
      filter.push({ terms: { 'category.id': categoryIds } });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: term,
                fields: ['name^3', 'description', 'sku'],
                fuzziness: 'AUTO',
              },
            },
          ],
          filter,
        },
      },
      size: CATALOG_SEARCH_MAX,
      _source: false,
      sort: [{ _score: { order: 'desc' } }],
    };

    const result = await this.elasticsearch.search('products', body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = result as any;
    const rawHits = r?.body?.hits?.hits ?? r?.hits?.hits ?? [];
    if (!Array.isArray(rawHits)) return [];
    return rawHits
      .map((h: { _id?: string }) => h._id)
      .filter((id): id is string => typeof id === 'string');
  }

  private async loadFilterRows(
    categoryIds: string[],
    params: PublicCatalogListParams,
  ): Promise<{ rows: CatalogFilterRow[]; searchRelevanceOrder: string[] | null }> {
    const where: Prisma.ProductWhereInput = {
      categoryId: { in: categoryIds },
      isActive: true,
    };

    const searchTerm = params.search?.trim();
    let searchRelevanceOrder: string[] | null = null;
    if (searchTerm) {
      const esIds = await this.elasticsearchSearchIds(searchTerm, categoryIds);
      if (esIds !== null) {
        if (esIds.length === 0) return { rows: [], searchRelevanceOrder: null };
        where.id = { in: esIds };
        searchRelevanceOrder = esIds;
      } else {
        where.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { sku: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }
    }

    const rows = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        stock: true,
        onOrder: true,
        sortOrder: true,
        createdAt: true,
        isNew: true,
        manufacturerId: true,
        manufacturer: { select: { id: true, name: true, slug: true } },
        attributes: true,
        category: {
          select: {
            slug: true,
            parent: { select: { slug: true } },
          },
        },
        doorThickness: { select: { name: true } },
        weatherstrip: { select: { name: true } },
      },
    });

    return { rows: rows as CatalogFilterRow[], searchRelevanceOrder };
  }
}
