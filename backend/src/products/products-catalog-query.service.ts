import { Injectable, NotFoundException } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { CatalogFilterBlocksService } from '../catalog-filter-blocks/catalog-filter-blocks.service';
import type { CatalogFiltersResponseDto } from '../catalog-filter-blocks/dto/public-filters.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { stripProductsForPublic } from './utils/product-public.util';

type CategoryWithChildren = Category & { children?: CategoryWithChildren[] };

const cardVariantsInclude = {
  cardVariants: { orderBy: { sortOrder: 'asc' as const } },
};

const cardBadgeSelectionsInclude = {
  cardBadgeSelections: {
    orderBy: { sortOrder: 'asc' as const },
    include: { badge: true },
  },
};

@Injectable()
export class ProductsCatalogQueryService {
  private readonly indexName = 'products';
  private readonly catalogSearchMaxSize = 10_000;

  constructor(
    private prisma: PrismaService,
    private elasticsearch: ElasticsearchService,
    private catalogFilterBlocks: CatalogFilterBlocksService,
  ) {}

  async findByCategory(categorySlug: string, search?: string) {
    // Находим категорию по slug
    const category = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
      include: {
        children: {
          include: {
            children: true, // Поддержка вложенности до 2 уровней
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${categorySlug} not found`);
    }

    // Рекурсивно собираем все ID категорий (включая все дочерние)
    const categoryIds = this.collectCategoryIds(category);
    const categoryIdSet = new Set(categoryIds);
    const term = search?.trim();

    let products;
    if (term) {
      const esIds = await this.elasticsearchSearchCatalogProductIds(term, categoryIds);
      if (esIds !== null && esIds.length > 0) {
        const loaded = await this.loadCatalogProductsOrderedByIds(esIds);
        products = loaded.filter((p) => categoryIdSet.has(p.categoryId));
        if (products.length === 0) {
          products = await this.findByCategoryFromPrisma(categoryIds, search);
        }
      } else {
        products = await this.findByCategoryFromPrisma(categoryIds, search);
      }
    } else {
      products = await this.findByCategoryFromPrisma(categoryIds, undefined);
    }

    const enrichedProducts = await this.enrichProductsWithRating(products);
    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
      products: stripProductsForPublic(enrichedProducts),
      total: products.length,
    };
  }

  /** Обогащает товары средним рейтингом и количеством одобренных отзывов */
  private async enrichProductsWithRatingPrivate<T extends { id: string }>(
    products: T[],
  ): Promise<(T & { rating: number; reviewsCount: number })[]> {
    if (products.length === 0) return [];
    const productIds = products.map((p) => p.id);
    const agg = await this.prisma.review.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds }, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    });
    const ratingMap = new Map(
      agg.map((a) => [
        a.productId,
        {
          rating: a._avg.rating ? Math.round(a._avg.rating * 10) / 10 : 0,
          reviewsCount: a._count.id,
        },
      ]),
    );
    return products.map((p) => {
      const r = ratingMap.get(p.id) ?? { rating: 0, reviewsCount: 0 };
      return { ...p, rating: r.rating, reviewsCount: r.reviewsCount };
    });
  }

  // Вспомогательный метод для рекурсивного сбора ID категорий
  private collectCategoryIds(category: CategoryWithChildren): string[] {
    const ids = [category.id];
    if (category.children && category.children.length > 0) {
      for (const child of category.children) {
        ids.push(...this.collectCategoryIds(child));
      }
    }
    return ids;
  }

  /** Условие публичного поиска: наименование или артикул (внутренний SKU). */
  private buildPublicProductSearchWhere(search?: string): Prisma.ProductWhereInput | undefined {
    const term = search?.trim();
    if (!term) return undefined;
    return {
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
      ],
    };
  }

  getCatalogPublicListInclude(): Prisma.ProductInclude {
    return this.catalogPublicListInclude();
  }

  /** Include для публичного списка товаров в каталоге (карточки, партнёр, варианты). */
  private catalogPublicListInclude(): Prisma.ProductInclude {
    return {
      category: {
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      manufacturer: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      coatingMaterial: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      canvasType: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      doorThickness: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      weatherstrip: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      partner: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          showLogoOnCards: true,
          tooltipText: true,
          showTooltip: true,
        },
      },
      ...cardVariantsInclude,
      ...cardBadgeSelectionsInclude,
    };
  }

  /**
   * Фильтры каталога: конфигурация из админки (Настройки → Блок фильтров).
   */
  async findCategoryFilters(categorySlug: string): Promise<CatalogFiltersResponseDto> {
    return this.catalogFilterBlocks.getPublicFiltersByCategorySlug(categorySlug);
  }

  /**
   * Разбор ответа search API: совместимость @elastic/elasticsearch v7 (`body`) и v8 (плоский объект).
   */
  private parseElasticsearchSearchResponse(result: unknown): {
    hitIds: string[];
    total: number;
  } {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = result as any;
    const rawHits = r?.body?.hits?.hits ?? r?.hits?.hits ?? [];
    const totalRaw = r?.body?.hits?.total ?? r?.hits?.total;
    const total =
      typeof totalRaw === 'number'
        ? totalRaw
        : typeof totalRaw?.value === 'number'
          ? totalRaw.value
          : 0;
    const hitIds = Array.isArray(rawHits)
      ? rawHits
          .map((h: { _id?: string }) => h._id)
          .filter((id): id is string => typeof id === 'string')
      : [];
    return { hitIds, total };
  }

  /**
   * Полнотекстовый поиск в индексе (релевантность, опечатки). Совпадает с полями `GET /products/search`.
   * @returns null — Elasticsearch недоступен; [] — запрос выполнен, совпадений нет; иначе id в порядке релевантности.
   */
  private async elasticsearchSearchCatalogProductIds(
    query: string,
    categoryIds?: string[],
  ): Promise<string[] | null> {
    if (!this.elasticsearch.isAvailable()) {
      return null;
    }
    const term = query.trim();
    if (!term) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any[] = [{ term: { isActive: true } }];
    if (categoryIds !== undefined && categoryIds.length > 0) {
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
      size: this.catalogSearchMaxSize,
      _source: false,
      sort: [{ _score: { order: 'desc' } }],
    };

    const result = await this.elasticsearch.search(this.indexName, body);
    const { hitIds } = this.parseElasticsearchSearchResponse(result);
    return hitIds;
  }

  /** Загрузка товаров для каталога с сохранением порядка id (например порядка ES). */
  private async loadCatalogProductsOrderedByIds(orderedIds: string[]) {
    if (orderedIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.product.findMany({
      where: {
        id: { in: orderedIds },
        isActive: true,
      },
      include: this.catalogPublicListInclude(),
    });
    const map = new Map(rows.map((p) => [p.id, p]));
    return orderedIds.map((id) => map.get(id)).filter((p): p is (typeof rows)[number] => p != null);
  }

  private async findByCategoryFromPrisma(categoryIds: string[], search?: string) {
    const searchWhere = this.buildPublicProductSearchWhere(search);
    return this.prisma.product.findMany({
      where: {
        categoryId: { in: categoryIds },
        isActive: true,
        ...(searchWhere ?? {}),
      },
      include: this.catalogPublicListInclude(),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** Популярные товары для главной страницы. primaryFilter: featured | new | featured_or_new | any. secondaryOrder: sort_order | created_desc */
  async findFeatured(
    limit = 8,
    primaryFilter: 'featured' | 'new' | 'featured_or_new' | 'any' = 'featured',
    secondaryOrder: 'sort_order' | 'created_desc' = 'sort_order',
  ) {
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      secondaryOrder === 'created_desc'
        ? [{ createdAt: Prisma.SortOrder.desc }, { sortOrder: Prisma.SortOrder.asc }]
        : [{ sortOrder: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.desc }];

    const baseWhere = { isActive: true };
    let primaryWhere: { isActive: boolean; isFeatured?: boolean; isNew?: boolean; OR?: object[] };

    switch (primaryFilter) {
      case 'featured':
        primaryWhere = { ...baseWhere, isFeatured: true };
        break;
      case 'new':
        primaryWhere = { ...baseWhere, isNew: true };
        break;
      case 'featured_or_new':
        primaryWhere = {
          ...baseWhere,
          OR: [{ isFeatured: true }, { isNew: true }],
        };
        break;
      default:
        // any — без приоритета, просто активные
        const all = await this.prisma.product.findMany({
          where: baseWhere,
          include: {
            category: true,
            partner: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                showLogoOnCards: true,
                tooltipText: true,
                showTooltip: true,
              },
            },
            ...cardVariantsInclude,
            ...cardBadgeSelectionsInclude,
          },
          orderBy,
          take: limit,
        });
        const enriched = await this.enrichProductsWithRating(all);
        return { products: stripProductsForPublic(enriched) };
    }

    const partnerInclude = {
      partner: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          showLogoOnCards: true,
          tooltipText: true,
          showTooltip: true,
        },
      },
      ...cardVariantsInclude,
      ...cardBadgeSelectionsInclude,
    };
    const primary = await this.prisma.product.findMany({
      where: primaryWhere,
      include: { category: true, ...partnerInclude },
      orderBy,
      take: limit,
    });

    if (primary.length >= limit) {
      const enriched = await this.enrichProductsWithRating(primary);
      return { products: stripProductsForPublic(enriched) };
    }

    const primaryIds = primary.map((p) => p.id);
    const additional = await this.prisma.product.findMany({
      where: {
        ...baseWhere,
        id: { notIn: primaryIds },
      },
      include: { category: true, ...partnerInclude },
      orderBy,
      take: limit - primary.length,
    });

    const combined = [...primary, ...additional];
    const enriched = await this.enrichProductsWithRating(combined);
    return { products: stripProductsForPublic(enriched) };
  }

  async search(searchDto: SearchProductsDto) {
    const { query, category, minPrice, maxPrice, page = 1, limit = 20 } = searchDto;
    const from = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchQuery: any = {
      query: {
        bool: {
          must: [],
        },
      },
      from,
      size: limit,
    };

    if (query) {
      searchQuery.query.bool.must.push({
        multi_match: {
          query,
          fields: ['name^3', 'description', 'sku'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (category) {
      searchQuery.query.bool.must.push({
        term: { 'category.slug': category },
      });
    }

    if (minPrice || maxPrice) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const range: any = {};
      if (minPrice) range.gte = minPrice;
      if (maxPrice) range.lte = maxPrice;
      searchQuery.query.bool.must.push({ range: { price: range } });
    }

    const result = await this.elasticsearch.search(this.indexName, searchQuery);
    const { hitIds: productIds, total } = this.parseElasticsearchSearchResponse(result);

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        category: true,
      },
    });

    // Preserve order from Elasticsearch
    const productMap = new Map(products.map((p) => [p.id, p]));
    const orderedProducts = productIds.map((id: string) => productMap.get(id)).filter(Boolean);
    const enrichedProducts = await this.enrichProductsWithRating(
      orderedProducts as (typeof products)[0][],
    );

    return {
      products: stripProductsForPublic(enrichedProducts),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Подсказки для строки поиска (компактный ответ, порядок как в ES при наличии индекса). */
  async searchSuggestions(
    rawQuery: string,
    limit = 8,
  ): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      sku: string | null;
      imageUrl: string | null;
    }>
  > {
    const query = rawQuery.trim();
    if (query.length < 2) {
      return [];
    }
    const take = Math.min(Math.max(1, limit), 20);

    let orderedIds: string[] | null = null;
    if (this.elasticsearch.isAvailable()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: ['name^3', 'description', 'sku'],
                  fuzziness: 'AUTO',
                },
              },
            ],
            filter: [{ term: { isActive: true } }],
          },
        },
        size: take,
        _source: ['name', 'slug', 'sku', 'images'],
      };
      const result = await this.elasticsearch.search(this.indexName, body);
      const { hitIds } = this.parseElasticsearchSearchResponse(result);
      if (hitIds.length > 0) {
        orderedIds = hitIds;
      }
    }

    const mapRow = (p: {
      id: string;
      name: string;
      slug: string;
      sku: string | null;
      images: string[];
    }) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      imageUrl: p.images?.[0] ?? null,
    });

    if (!orderedIds) {
      const rows = await this.prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, slug: true, sku: true, images: true },
        take,
        orderBy: { name: 'asc' },
      });
      return rows.map(mapRow);
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: orderedIds }, isActive: true },
      select: { id: true, name: true, slug: true, sku: true, images: true },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    return orderedIds
      .map((id) => map.get(id))
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map(mapRow);
  }

  async enrichProductsWithRating<T extends { id: string }>(
    products: T[],
  ): Promise<(T & { rating: number; reviewsCount: number })[]> {
    return this.enrichProductsWithRatingPrivate(products);
  }
}
