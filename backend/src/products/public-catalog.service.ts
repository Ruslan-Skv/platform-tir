import { Injectable, NotFoundException } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { CatalogFilterBlocksService } from '../catalog-filter-blocks/catalog-filter-blocks.service';
import type {
  CatalogCategoryFilterOptionDto,
  CatalogFilterFacetDto,
  CatalogFiltersResponseDto,
} from '../catalog-filter-blocks/dto/public-filters.dto';
import type { PublicCatalogListParams, PublicCatalogSort } from './dto/public-catalog-list.dto';

type CategoryWithChildren = Category & { children?: CategoryWithChildren[] };

type CatalogFilterRow = {
  id: string;
  name: string;
  slug: string;
  price: Prisma.Decimal;
  stock: number;
  onOrder: boolean;
  sortOrder: number;
  createdAt: Date;
  isNew: boolean;
  manufacturerId: string | null;
  manufacturer?: { id: string; name: string; slug: string } | null;
  attributes: unknown;
  category: {
    slug: string;
    parent: { slug: string } | null;
  };
  doorThickness: { name: string } | null;
  weatherstrip: { name: string } | null;
};

type CatalogContext = {
  category: CategoryWithChildren;
  effectiveSlug: string;
  allCategoryIds: string[];
};

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 15;
const CATALOG_SEARCH_MAX = 10_000;

@Injectable()
export class PublicCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly elasticsearch: ElasticsearchService,
    private readonly catalogFilterBlocks: CatalogFilterBlocksService,
  ) {}

  /** Список + faceted-фильтры одним запросом (для SSR). */
  async getPage(params: PublicCatalogListParams) {
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const page = Math.max(params.page ?? 1, 1);
    const prepared = await this.prepareCatalogData(params);

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
      this.buildListResult(prepared, params, page, limit),
      this.buildFiltersResult(prepared.ctx, params, prepared.baseRows),
    ]);

    return {
      ...list,
      filters,
    };
  }

  async list(params: PublicCatalogListParams) {
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const page = Math.max(params.page ?? 1, 1);
    const prepared = await this.prepareCatalogData(params);

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

    return this.buildListResult(prepared, params, page, limit);
  }

  /** Faceted-фильтры: counts с учётом активных фильтров (кроме текущего фасета). */
  async getFacetedFilters(params: PublicCatalogListParams): Promise<CatalogFiltersResponseDto> {
    const prepared = await this.prepareCatalogData(params);
    if (!prepared) {
      return { branch: null, filters: [], categoryFilterOptions: [] };
    }
    return this.buildFiltersResult(prepared.ctx, params, prepared.baseRows);
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

  private async prepareCatalogData(params: PublicCatalogListParams): Promise<{
    ctx: CatalogContext;
    baseRows: CatalogFilterRow[];
    priceRange: { min: number; max: number } | null;
    searchRelevanceOrder: string[] | null;
  } | null> {
    const effectiveSlug = this.resolveEffectiveCategorySlug(params);
    if (!effectiveSlug) return null;

    const category = await this.prisma.category.findUnique({
      where: { slug: effectiveSlug },
      include: {
        children: { include: { children: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${effectiveSlug} not found`);
    }

    const allCategoryIds = this.collectCategoryIds(category as CategoryWithChildren);

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

  private async buildListResult(
    prepared: {
      ctx: CatalogContext;
      baseRows: CatalogFilterRow[];
      priceRange: { min: number; max: number } | null;
      searchRelevanceOrder: string[] | null;
    },
    params: PublicCatalogListParams,
    page: number,
    limit: number,
  ) {
    const { ctx, baseRows, priceRange, searchRelevanceOrder } = prepared;
    const { category } = ctx;

    const facets = await this.loadAttributeFacets(ctx.effectiveSlug);
    const filtered = this.filterRowsForList(baseRows, params, facets);

    const rowsForCatFacet = this.applyCrossFilters(baseRows, params, facets, {
      excludeCat: true,
    });
    const categoryFilterOptions = this.buildCategoryFilterOptionsFromRows(
      category,
      rowsForCatFacet,
    );

    const sort = params.sort ?? 'default';
    const sorted = await this.sortFilterRows(filtered, sort, searchRelevanceOrder);
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit) || 0;
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const skip = (safePage - 1) * limit;
    const pageIds = sorted.slice(skip, skip + limit).map((p) => p.id);

    const products = pageIds.length > 0 ? await this.loadPublicCardsByIds(pageIds) : [];

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

  private async buildFiltersResult(
    ctx: CatalogContext,
    params: PublicCatalogListParams,
    baseRows: CatalogFilterRow[],
  ): Promise<CatalogFiltersResponseDto> {
    const facets = await this.loadAttributeFacets(ctx.effectiveSlug);
    const rowsForCatFacet = this.applyCrossFilters(baseRows, params, facets, {
      excludeCat: true,
    });
    const categoryFilterOptions = this.buildCategoryFilterOptionsFromRows(
      ctx.category,
      rowsForCatFacet,
    );

    const block = await this.catalogFilterBlocks.resolveMatchingBlock(ctx.category.id);
    if (!block) {
      return { branch: null, filters: [], categoryFilterOptions };
    }

    const filters: CatalogFilterFacetDto[] = [];
    for (const item of block.items) {
      const rowsForFacet = this.applyCrossFiltersForBlockItem(baseRows, params, facets, item);
      const facet = this.catalogFilterBlocks.buildFacetFromBlockItem(item, rowsForFacet);
      if (facet) filters.push(facet);
    }

    return { branch: block.id, filters, categoryFilterOptions };
  }

  /** Метаданные фасетов для сопоставления attr_* в URL с полями товара. */
  private async loadAttributeFacets(effectiveSlug: string): Promise<CatalogFilterFacetDto[]> {
    try {
      const block = await this.catalogFilterBlocks.getPublicFiltersByCategorySlug(effectiveSlug);
      return block.filters;
    } catch {
      return [];
    }
  }

  private resolveEffectiveCategorySlug(params: PublicCatalogListParams): string | null {
    if (params.categorySlug && params.categorySlug !== 'all') {
      return params.categorySlug;
    }
    return params.branch?.trim() || null;
  }

  private emptyCategoryPage(
    category: Category,
    page: number,
    limit: number,
    priceRange: { min: number; max: number } | null = null,
  ) {
    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
      products: [],
      total: 0,
      page: Math.max(page, 1),
      limit,
      totalPages: 0,
      priceRange,
      categoryFilterOptions: [] as CatalogCategoryFilterOptionDto[],
    };
  }

  private buildCategoryFilterOptionsFromRows(
    category: CategoryWithChildren,
    rows: CatalogFilterRow[],
  ): CatalogCategoryFilterOptionDto[] {
    const countDirect = new Map<string, number>();
    for (const row of rows) {
      const slug = row.category.slug;
      countDirect.set(slug, (countDirect.get(slug) ?? 0) + 1);
    }

    const collectSlugs = (cat: CategoryWithChildren): Set<string> => {
      const slugs = new Set<string>([cat.slug]);
      for (const child of cat.children ?? []) {
        for (const s of collectSlugs(child)) slugs.add(s);
      }
      return slugs;
    };

    const subtreeCount = (cat: CategoryWithChildren): number => {
      const slugs = collectSlugs(cat);
      return rows.filter((r) => slugs.has(r.category.slug)).length;
    };

    const walk = (cat: CategoryWithChildren, depth: 0 | 1): CatalogCategoryFilterOptionDto[] => {
      const out: CatalogCategoryFilterOptionDto[] = [];
      const count = depth === 0 ? subtreeCount(cat) : (countDirect.get(cat.slug) ?? 0);

      if (depth === 0) {
        if ((cat.children?.length ?? 0) > 0 || count > 0) {
          out.push({ slug: cat.slug, label: cat.name, count, depth });
        }
      } else if (count > 0) {
        out.push({ slug: cat.slug, label: cat.name, count, depth });
      }

      for (const child of cat.children ?? []) {
        out.push(...walk(child, 1));
      }
      return out;
    };

    const options = walk(category, 0);
    return options.length > 1 ? options : [];
  }

  /**
   * ?cat=slug родителя должен включать товары из подкатегорий (как applyCatalogFilters на клиенте).
   */
  private matchesCategoryCatFilter(
    category: { slug: string; parent: { slug: string } | null },
    allowed: Set<string>,
  ): boolean {
    if (allowed.has(category.slug)) return true;
    const parentSlug = category.parent?.slug;
    return parentSlug != null && allowed.has(parentSlug);
  }

  private getAvailability(stock: number, onOrder: boolean): string {
    if (stock > 0) return 'in_stock';
    if (onOrder) return 'on_order';
    return 'out_of_stock';
  }

  private filterRowsForList(
    rows: CatalogFilterRow[],
    params: PublicCatalogListParams,
    facets: CatalogFilterFacetDto[],
  ): CatalogFilterRow[] {
    return this.applyCrossFilters(rows, params, facets, {});
  }

  private applyCrossFiltersForBlockItem(
    rows: CatalogFilterRow[],
    params: PublicCatalogListParams,
    facets: CatalogFilterFacetDto[],
    item: {
      kind: string;
      attribute?: { slug: string; name: string } | null;
    },
  ): CatalogFilterRow[] {
    const excludeAttributeSlug =
      item.kind === 'ATTRIBUTE' && item.attribute?.slug ? item.attribute.slug : undefined;

    return this.applyCrossFilters(rows, params, facets, {
      excludeMfr: item.kind === 'MANUFACTURER',
      excludeAvail: item.kind === 'STOCK',
      excludeAttributeSlug,
    });
  }

  private applyCrossFilters(
    rows: CatalogFilterRow[],
    params: PublicCatalogListParams,
    facets: CatalogFilterFacetDto[],
    options: {
      excludeCat?: boolean;
      excludeMfr?: boolean;
      excludeAvail?: boolean;
      excludePrice?: boolean;
      excludeAttributeSlug?: string;
    },
  ): CatalogFilterRow[] {
    let result = rows;

    if (!options.excludeCat && params.cat?.length) {
      const allowed = new Set(params.cat);
      result = result.filter((p) => this.matchesCategoryCatFilter(p.category, allowed));
    }

    if (!options.excludeAvail && params.avail?.length) {
      const allowed = new Set(params.avail);
      result = result.filter((p) => allowed.has(this.getAvailability(p.stock, p.onOrder)));
    }

    if (!options.excludeMfr && params.mfr?.length) {
      const allowed = new Set(params.mfr.map((v) => v.trim()).filter(Boolean));
      result = result.filter((p) => this.matchesMfrFilter(p, allowed, facets));
    }

    if (!options.excludePrice && (params.priceMin !== undefined || params.priceMax !== undefined)) {
      result = result.filter((p) => {
        const price = Number(p.price);
        if (params.priceMin !== undefined && price < params.priceMin) return false;
        if (params.priceMax !== undefined && price > params.priceMax) return false;
        return true;
      });
    }

    if (params.attributes && Object.keys(params.attributes).length > 0) {
      result = result.filter((p) =>
        this.matchesAttributeFilters(p, params.attributes!, facets, options.excludeAttributeSlug),
      );
    }

    return result;
  }

  private matchesMfrFilter(
    product: CatalogFilterRow,
    allowed: Set<string>,
    facets: CatalogFilterFacetDto[],
  ): boolean {
    if (product.manufacturerId && allowed.has(product.manufacturerId)) {
      return true;
    }
    const name = product.manufacturer?.name?.trim();
    if (name && allowed.has(name)) return true;
    const slug = product.manufacturer?.slug?.trim();
    if (slug && allowed.has(slug)) return true;

    const attrFacet = facets.find((f) => f.id === 'manufacturer' && f.attributeSlug);
    if (attrFacet?.attributeSlug) {
      const attrValue = this.catalogFilterBlocks.getAttrValueForFacetProduct(product, {
        slug: attrFacet.attributeSlug,
        name: attrFacet.attributeName ?? attrFacet.attributeSlug,
      });
      if (attrValue && allowed.has(attrValue.trim())) return true;
    }

    return false;
  }

  private matchesAttributeFilters(
    product: CatalogFilterRow,
    attributeFilters: Record<string, string[]>,
    facets: Array<{ id: string; attributeSlug?: string; attributeName?: string | null }>,
    excludeAttributeSlug?: string,
  ): boolean {
    for (const [filterId, selectedValues] of Object.entries(attributeFilters)) {
      if (selectedValues.length === 0) continue;
      const facet = facets.find((f) => f.id === filterId);
      const slug = facet?.attributeSlug ?? filterId;
      if (excludeAttributeSlug && slug === excludeAttributeSlug) {
        continue;
      }
      const name = facet?.attributeName ?? facet?.id ?? filterId;
      const value = this.catalogFilterBlocks.getAttrValueForFacetProduct(product, {
        slug,
        name,
      });
      if (value == null) return false;
      const normalizedValue = value.trim();
      const matches = selectedValues.some((v) => v.trim() === normalizedValue);
      if (!matches) {
        return false;
      }
    }
    return true;
  }

  private async sortFilterRows(
    rows: CatalogFilterRow[],
    sort: PublicCatalogSort,
    searchRelevanceOrder?: string[] | null,
  ) {
    if (sort === 'default' && searchRelevanceOrder?.length) {
      const rank = new Map(searchRelevanceOrder.map((id, index) => [id, index]));
      return [...rows].sort((a, b) => {
        const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    if (sort === 'rating') {
      const ratings = await this.loadRatingsMap(rows.map((r) => r.id));
      return [...rows].sort((a, b) => {
        const ra = ratings.get(a.id) ?? 0;
        const rb = ratings.get(b.id) ?? 0;
        if (rb !== ra) return rb - ra;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    return [...rows].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price.comparedTo(b.price);
        case 'price-desc':
          return b.price.comparedTo(a.price);
        case 'name-asc':
          return a.name.localeCompare(b.name, 'ru');
        case 'name-desc':
          return b.name.localeCompare(a.name, 'ru');
        case 'new':
          if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'default':
        default:
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
  }

  private async loadRatingsMap(productIds: string[]): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();
    const agg = await this.prisma.review.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds }, isApproved: true },
      _avg: { rating: true },
    });
    return new Map(
      agg.map((a) => [a.productId, a._avg.rating ? Math.round(a._avg.rating * 10) / 10 : 0]),
    );
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

  private catalogPublicListInclude(): Prisma.ProductInclude {
    return {
      category: {
        include: {
          parent: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
      manufacturer: { select: { id: true, name: true, slug: true } },
      coatingMaterial: { select: { id: true, name: true, slug: true } },
      canvasType: { select: { id: true, name: true, slug: true } },
      doorThickness: { select: { id: true, name: true, slug: true } },
      weatherstrip: { select: { id: true, name: true, slug: true } },
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
      cardVariants: { orderBy: { sortOrder: 'asc' as const } },
      cardBadgeSelections: {
        orderBy: { sortOrder: 'asc' as const },
        include: { badge: true },
      },
    };
  }

  /** Карточки товаров для публичного каталога в заданном порядке id. */
  async getPublicCardsByIds(orderedIds: string[]) {
    if (orderedIds.length === 0) return [];
    return this.loadPublicCardsByIds(orderedIds);
  }

  private async loadPublicCardsByIds(orderedIds: string[]) {
    const rows = await this.prisma.product.findMany({
      where: { id: { in: orderedIds }, isActive: true },
      include: this.catalogPublicListInclude(),
    });
    const map = new Map(rows.map((p) => [p.id, p]));
    const ordered = orderedIds
      .map((id) => map.get(id))
      .filter((p): p is (typeof rows)[number] => p != null);

    const agg = await this.prisma.review.groupBy({
      by: ['productId'],
      where: { productId: { in: orderedIds }, isApproved: true },
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

    return ordered.map((p) => {
      const r = ratingMap.get(p.id) ?? { rating: 0, reviewsCount: 0 };
      return { ...p, rating: r.rating, reviewsCount: r.reviewsCount };
    });
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

    // price/mfr/cat/avail/attr — только в applyCrossFilters, чтобы фасеты и список
    // считались от одной базы товаров ветки (иначе price в URL обнуляет baseRows и все счётчики).

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
