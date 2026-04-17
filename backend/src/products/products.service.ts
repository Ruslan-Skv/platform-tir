import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { PriceScraperService } from './price-scraper.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { Category, Prisma } from '@prisma/client';

import { CatalogFilterBlocksService } from '../catalog-filter-blocks/catalog-filter-blocks.service';
import type { CatalogFiltersResponseDto } from '../catalog-filter-blocks/dto/public-filters.dto';

export type {
  CatalogFilterFacetDto,
  CatalogFilterOptionDto,
  CatalogFiltersResponseDto,
} from '../catalog-filter-blocks/dto/public-filters.dto';

type CategoryWithChildren = Category & { children?: CategoryWithChildren[] };

export interface SyncSupplierPricesResult {
  total: number;
  updated: number;
  changed: number;
  errors: Array<{ productId: string; productName: string; error: string }>;
}

export interface UpdateSupplierPricesResult {
  total: number;
  updated: number;
  changed: number;
  changedIds: string[];
  errors: Array<{ productId: string; productName: string; error: string }>;
}

export interface ApplySupplierPricesResult {
  total: number;
  synced: number;
  syncedIds: string[];
  errors: Array<{ productId: string; productName: string; error: string }>;
}

@Injectable()
export class ProductsService {
  private readonly indexName = 'products';

  constructor(
    private prisma: PrismaService,
    private elasticsearch: ElasticsearchService,
    private priceScraper: PriceScraperService,
    private catalogFilterBlocks: CatalogFilterBlocksService,
  ) {}

  private readonly cardVariantsInclude = {
    cardVariants: { orderBy: { sortOrder: 'asc' as const } },
  };

  private readonly cardBadgeSelectionsInclude = {
    cardBadgeSelections: {
      orderBy: { sortOrder: 'asc' as const },
      include: { badge: true },
    },
  };

  /** Лимит выдачи при полнотекстовом поиске в каталоге (как у окна ES по умолчанию). */
  private readonly catalogSearchMaxSize = 10_000;

  private readonly createdByUpdatedByInclude = {
    createdBy: { select: { email: true } },
    updatedBy: { select: { email: true } },
  };

  /** Артикул товара у поставщика (с сайта поставщика); не подставляем внутренний SKU. */
  private normalizeSupplierSku(value: string | null | undefined): string {
    if (value == null) return '';
    return String(value).trim();
  }

  /** Замена набора бэйджей карточки (слева от фото), не более 5 уникальных id из справочника. */
  private async syncProductCardBadges(productId: string, badgeIds: string[] | undefined | null) {
    if (badgeIds === undefined) {
      return;
    }
    const list = badgeIds ?? [];
    const unique = [...new Set(list.filter((id) => typeof id === 'string' && id.trim()))];
    if (unique.length > 5) {
      throw new BadRequestException('На один товар можно назначить не более 5 бэйджей карточки');
    }
    await this.prisma.productCardBadgeOnProduct.deleteMany({ where: { productId } });
    if (unique.length === 0) {
      return;
    }
    const defs = await this.prisma.productCardBadgeDefinition.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    if (defs.length !== unique.length) {
      throw new BadRequestException('Указан неизвестный идентификатор бэйджа карточки');
    }
    await this.prisma.productCardBadgeOnProduct.createMany({
      data: unique.map((badgeId, i) => ({
        productId,
        badgeId,
        sortOrder: i,
      })),
    });
  }

  async create(createProductDto: CreateProductDto, userId?: string) {
    // Поля поставщика, партнёра и cardVariants — исключаем из data для prisma.product.create
    const {
      supplierId,
      supplierProductUrl,
      supplierPrice,
      supplierSku,
      categoryId,
      partnerId,
      manufacturerId,
      coatingMaterialId,
      canvasTypeId,
      doorThicknessId,
      weatherstripId,
      cardVariants,
      catalogBadgeIds,
      ...productData
    } = createProductDto;
    const data: Prisma.ProductCreateInput = {
      ...productData,
      category: {
        connect: { id: categoryId },
      },
      ...(userId && { createdBy: { connect: { id: userId } } }),
    };
    if (manufacturerId && manufacturerId.trim()) {
      data.manufacturer = { connect: { id: manufacturerId.trim() } };
    }
    if (coatingMaterialId && coatingMaterialId.trim()) {
      data.coatingMaterial = { connect: { id: coatingMaterialId.trim() } };
    }
    if (canvasTypeId && canvasTypeId.trim()) {
      data.canvasType = { connect: { id: canvasTypeId.trim() } };
    }
    if (doorThicknessId && doorThicknessId.trim()) {
      data.doorThickness = { connect: { id: doorThicknessId.trim() } };
    }
    if (weatherstripId && weatherstripId.trim()) {
      data.weatherstrip = { connect: { id: weatherstripId.trim() } };
    }
    // Преобразуем null в пустые массивы для sizes и openingSide
    // В PostgreSQL массивы не могут быть null, только пустые массивы []
    if (data.sizes === null) {
      data.sizes = [];
    }
    if (data.openingSide === null) {
      data.openingSide = [];
    }
    // partnerId → partner relation
    if (partnerId && partnerId.trim()) {
      data.partner = { connect: { id: partnerId } };
    }

    const product = await this.prisma.product.create({
      data,
      include: {
        category: true,
        ...this.cardVariantsInclude,
        ...this.createdByUpdatedByInclude,
      },
    });

    await this.syncProductCardBadges(product.id, catalogBadgeIds ?? []);

    // Схожие товары в карточке (до 5)
    if (cardVariants && cardVariants.length > 0) {
      const toCreate = cardVariants.slice(0, 5).map((v, i) => ({
        productId: product.id,
        name: v.name,
        price: new Prisma.Decimal(v.price),
        image: v.image ?? null,
        size: v.size ?? null,
        color: v.color ?? null,
        extraOption: v.extraOption ?? null,
        sortOrder: v.sortOrder ?? i,
      }));
      await this.prisma.productCardVariant.createMany({ data: toCreate });
      const withVariants = await this.prisma.product.findUnique({
        where: { id: product.id },
        include: { category: true, ...this.cardVariantsInclude },
      });
      if (withVariants) await this.indexProduct(withVariants);
    }

    // Если указан поставщик, создаем связь ProductSupplier
    if (supplierId) {
      // Сначала снимаем флаг isMainSupplier у всех существующих поставщиков этого товара (если есть)
      await this.prisma.productSupplier.updateMany({
        where: { productId: product.id },
        data: { isMainSupplier: false },
      });

      // Создаем или обновляем связь с поставщиком
      await this.prisma.productSupplier.upsert({
        where: {
          productId_supplierId: {
            productId: product.id,
            supplierId: supplierId,
          },
        },
        create: {
          productId: product.id,
          supplierId: supplierId,
          supplierSku: this.normalizeSupplierSku(supplierSku),
          supplierPrice: supplierPrice ? new Prisma.Decimal(supplierPrice) : product.price,
          supplierProductUrl: supplierProductUrl || null,
          supplierStock: product.stock || 0,
          isMainSupplier: true,
        },
        update: {
          isMainSupplier: true,
          ...(supplierSku !== undefined && {
            supplierSku: this.normalizeSupplierSku(supplierSku),
          }),
          ...(supplierPrice !== undefined && { supplierPrice: new Prisma.Decimal(supplierPrice) }),
          ...(supplierProductUrl !== undefined && {
            supplierProductUrl: supplierProductUrl || null,
          }),
        },
      });
    }

    // Index in Elasticsearch
    await this.indexProduct(product);

    const createdFull = await this.prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        ...this.cardVariantsInclude,
        ...this.cardBadgeSelectionsInclude,
        ...this.createdByUpdatedByInclude,
      },
    });
    return createdFull ?? product;
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // Для админки - возвращает ВСЕ товары (включая неактивные)
  async findAllAdmin() {
    return this.prisma.product.findMany({
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        suppliers: {
          where: {
            isMainSupplier: true,
          },
          include: {
            supplier: {
              select: {
                id: true,
                legalName: true,
                commercialName: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Уникальные размеры из товаров категории (для подсказок в форме создания/редактирования) */
  async getSizesByCategoryId(categoryId: string): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where: {
        categoryId,
        sizes: { isEmpty: false },
      },
      select: { sizes: true },
    });
    const set = new Set<string>();
    for (const p of products) {
      for (const s of p.sizes) {
        const trimmed = s?.trim();
        if (trimmed) set.add(trimmed);
      }
    }
    return Array.from(set).sort();
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
        },
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                legalName: true,
                commercialName: true,
              },
            },
          },
        },
        manufacturer: {
          select: { id: true, name: true, slug: true },
        },
        coatingMaterial: {
          select: { id: true, name: true, slug: true },
        },
        canvasType: {
          select: { id: true, name: true, slug: true },
        },
        doorThickness: {
          select: { id: true, name: true, slug: true },
        },
        weatherstrip: {
          select: { id: true, name: true, slug: true },
        },
        ...this.cardVariantsInclude,
        ...this.cardBadgeSelectionsInclude,
        ...this.createdByUpdatedByInclude,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const [enriched] = await this.enrichProductsWithRating([product]);
    return enriched ?? product;
  }

  /** Активные товары по ID для страницы сравнения (гость и т.п.), порядок как в запросе. */
  async findManyActiveByIdsForCompare(ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 10);
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.prisma.product.findMany({
      where: { id: { in: unique }, isActive: true },
      include: this.catalogPublicListInclude(),
    });
    const map = new Map(rows.map((p) => [p.id, p]));
    const ordered = unique.map((id) => map.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
    return this.enrichProductsWithRating(ordered);
  }

  /** Активные товары по ID для избранного (гость и т.п.), порядок как в запросе, до 500 шт. */
  async findManyActiveByIdsForWishlist(ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 500);
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.prisma.product.findMany({
      where: { id: { in: unique }, isActive: true },
      include: this.catalogPublicListInclude(),
    });
    const map = new Map(rows.map((p) => [p.id, p]));
    const ordered = unique.map((id) => map.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
    return this.enrichProductsWithRating(ordered);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
        },
        ...this.cardVariantsInclude,
        ...this.cardBadgeSelectionsInclude,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }

    const [enriched] = await this.enrichProductsWithRating([product]);
    return enriched ?? product;
  }

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
      products: enrichedProducts,
      total: products.length,
    };
  }

  /** Обогащает товары средним рейтингом и количеством одобренных отзывов */
  private async enrichProductsWithRating<T extends { id: string }>(
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
      ...this.cardVariantsInclude,
      ...this.cardBadgeSelectionsInclude,
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

  private async findAllProductsFromPrisma(search?: string) {
    const searchWhere = this.buildPublicProductSearchWhere(search);
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(searchWhere ?? {}),
      },
      include: this.catalogPublicListInclude(),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
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

  // Получить все товары (для страницы "Каталог товаров")
  async findAllProducts(search?: string) {
    const term = search?.trim();
    let products;

    if (term) {
      const esIds = await this.elasticsearchSearchCatalogProductIds(term);
      if (esIds !== null && esIds.length > 0) {
        products = await this.loadCatalogProductsOrderedByIds(esIds);
        if (products.length === 0) {
          products = await this.findAllProductsFromPrisma(search);
        }
      } else {
        products = await this.findAllProductsFromPrisma(search);
      }
    } else {
      products = await this.findAllProductsFromPrisma(undefined);
    }

    const enrichedProducts = await this.enrichProductsWithRating(products);
    return {
      category: {
        id: 'all',
        name: 'Каталог товаров',
        slug: 'all',
        description: 'Все товары',
      },
      products: enrichedProducts,
      total: enrichedProducts.length,
    };
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
            ...this.cardVariantsInclude,
            ...this.cardBadgeSelectionsInclude,
          },
          orderBy,
          take: limit,
        });
        const enriched = await this.enrichProductsWithRating(all);
        return { products: enriched };
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
      ...this.cardVariantsInclude,
      ...this.cardBadgeSelectionsInclude,
    };
    const primary = await this.prisma.product.findMany({
      where: primaryWhere,
      include: { category: true, ...partnerInclude },
      orderBy,
      take: limit,
    });

    if (primary.length >= limit) {
      const enriched = await this.enrichProductsWithRating(primary);
      return { products: enriched };
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
    return { products: enriched };
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
      products: enrichedProducts,
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

  async update(id: string, updateProductDto: UpdateProductDto, userId?: string) {
    await this.findOne(id);

    // Поля поставщика, партнёра и cardVariants — исключаем из data для prisma.product.update
    const {
      supplierId,
      supplierProductUrl,
      supplierPrice,
      supplierSku,
      categoryId,
      partnerId,
      manufacturerId,
      coatingMaterialId,
      canvasTypeId,
      doorThicknessId,
      weatherstripId,
      cardVariants,
      catalogBadgeIds,
      ...productData
    } = updateProductDto;
    const data: Prisma.ProductUpdateInput = {
      ...productData,
      ...(userId && { updatedBy: { connect: { id: userId } } }),
    };

    if (manufacturerId !== undefined) {
      data.manufacturer = manufacturerId
        ? { connect: { id: manufacturerId } }
        : { disconnect: true };
    }

    if (coatingMaterialId !== undefined) {
      data.coatingMaterial = coatingMaterialId
        ? { connect: { id: coatingMaterialId } }
        : { disconnect: true };
    }

    if (canvasTypeId !== undefined) {
      data.canvasType = canvasTypeId ? { connect: { id: canvasTypeId } } : { disconnect: true };
    }

    if (doorThicknessId !== undefined) {
      data.doorThickness = doorThicknessId
        ? { connect: { id: doorThicknessId } }
        : { disconnect: true };
    }

    if (weatherstripId !== undefined) {
      data.weatherstrip = weatherstripId
        ? { connect: { id: weatherstripId } }
        : { disconnect: true };
    }

    // Преобразуем categoryId в связь category, если он передан
    if (categoryId !== undefined) {
      data.category = {
        connect: { id: categoryId },
      };
    }

    if ('attributes' in updateProductDto) {
      // Явно устанавливаем attributes для полной замены
      // Prisma заменит весь JSON объект
      data.attributes = updateProductDto.attributes ?? {};
    }

    // Преобразуем null в пустые массивы для sizes и openingSide
    // В PostgreSQL массивы не могут быть null, только пустые массивы []
    if ('sizes' in updateProductDto) {
      data.sizes = updateProductDto.sizes === null ? [] : updateProductDto.sizes;
    }
    if ('openingSide' in updateProductDto) {
      data.openingSide = updateProductDto.openingSide === null ? [] : updateProductDto.openingSide;
    }
    // partnerId → partner relation
    if ('partnerId' in updateProductDto) {
      data.partner =
        partnerId && partnerId.trim() ? { connect: { id: partnerId } } : { disconnect: true };
    }

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        ...this.cardVariantsInclude,
        ...this.cardBadgeSelectionsInclude,
        ...this.createdByUpdatedByInclude,
      },
    });

    // Схожие товары в карточке (до 5): полная замена списка
    if ('cardVariants' in updateProductDto) {
      await this.prisma.productCardVariant.deleteMany({ where: { productId: id } });
      const list = cardVariants ?? [];
      if (list.length > 0) {
        const toCreate = list.slice(0, 5).map((v, i) => ({
          productId: id,
          name: v.name,
          price: new Prisma.Decimal(v.price),
          image: v.image ?? null,
          size: v.size ?? null,
          color: v.color ?? null,
          extraOption: v.extraOption ?? null,
          sortOrder: v.sortOrder ?? i,
        }));
        await this.prisma.productCardVariant.createMany({ data: toCreate });
      }
    }

    // Обработка поставщика
    if (
      'supplierId' in updateProductDto ||
      'supplierProductUrl' in updateProductDto ||
      'supplierPrice' in updateProductDto ||
      'supplierSku' in updateProductDto
    ) {
      if (supplierId) {
        // Сначала снимаем флаг isMainSupplier у всех существующих поставщиков этого товара
        await this.prisma.productSupplier.updateMany({
          where: { productId: id },
          data: { isMainSupplier: false },
        });

        // Создаем или обновляем связь с поставщиком
        await this.prisma.productSupplier.upsert({
          where: {
            productId_supplierId: {
              productId: id,
              supplierId: supplierId,
            },
          },
          create: {
            productId: id,
            supplierId: supplierId,
            supplierSku: this.normalizeSupplierSku(supplierSku),
            supplierPrice: supplierPrice ? new Prisma.Decimal(supplierPrice) : product.price,
            supplierProductUrl: supplierProductUrl || null,
            supplierStock: product.stock || 0,
            isMainSupplier: true,
          },
          update: {
            isMainSupplier: true,
            ...(supplierSku !== undefined && {
              supplierSku: this.normalizeSupplierSku(supplierSku),
            }),
            ...(supplierPrice !== undefined && {
              supplierPrice: new Prisma.Decimal(supplierPrice),
            }),
            ...(supplierProductUrl !== undefined && {
              supplierProductUrl: supplierProductUrl || null,
            }),
          },
        });
      } else if (
        supplierProductUrl !== undefined ||
        supplierPrice !== undefined ||
        supplierSku !== undefined
      ) {
        // Если обновляются только supplierProductUrl или supplierPrice, но supplierId не указан
        // Находим главного поставщика и обновляем его данные
        const mainSupplier = await this.prisma.productSupplier.findFirst({
          where: {
            productId: id,
            isMainSupplier: true,
          },
        });

        if (mainSupplier) {
          await this.prisma.productSupplier.update({
            where: { id: mainSupplier.id },
            data: {
              ...(supplierSku !== undefined && {
                supplierSku: this.normalizeSupplierSku(supplierSku),
              }),
              ...(supplierPrice !== undefined && {
                supplierPrice: new Prisma.Decimal(supplierPrice),
              }),
              ...(supplierProductUrl !== undefined && {
                supplierProductUrl: supplierProductUrl || null,
              }),
            },
          });
        }
      } else {
        // Если supplierId не указан (пользователь убрал поставщика),
        // удаляем связь с главным поставщиком, чтобы счетчик обновился
        await this.prisma.productSupplier.deleteMany({
          where: {
            productId: id,
            isMainSupplier: true,
          },
        });
      }
    }

    if (catalogBadgeIds !== undefined) {
      await this.syncProductCardBadges(id, catalogBadgeIds ?? []);
    }

    // После правок ProductSupplier нужен повторный findUnique: первый prisma.product.update
    // выполняется до upsert поставщика — иначе в ответе PATCH не было бы актуальных suppliers/supplierSku.
    const toReturn = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                legalName: true,
                commercialName: true,
              },
            },
          },
        },
        ...this.cardVariantsInclude,
        ...this.cardBadgeSelectionsInclude,
        ...this.createdByUpdatedByInclude,
      },
    });
    if (toReturn) await this.indexProduct(toReturn);
    return toReturn ?? product;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Явно удаляем связи с поставщиками перед удалением товара
    // Это гарантирует, что счетчики обновятся корректно
    await this.prisma.productSupplier.deleteMany({
      where: { productId: id },
    });

    await this.prisma.product.delete({
      where: { id },
    });

    // Remove from Elasticsearch
    await this.elasticsearch.deleteDocument(this.indexName, id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async indexProduct(product: any) {
    try {
      await this.elasticsearch.createIndex(this.indexName, {
        mappings: {
          properties: {
            name: { type: 'text', analyzer: 'russian' },
            description: { type: 'text', analyzer: 'russian' },
            sku: { type: 'keyword' },
            price: { type: 'float' },
            category: {
              type: 'object',
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' },
                slug: { type: 'keyword' },
              },
            },
          },
        },
      });

      await this.elasticsearch.indexDocument(this.indexName, product.id, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        sku: product.sku,
        price: parseFloat(product.price.toString()),
        category: {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
        },
        images: product.images,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
      });
    } catch (error) {
      console.error('Error indexing product:', error);
    }
  }

  /**
   * Переиндексация всех товаров в Elasticsearch (для миграции или восстановления поиска)
   */
  async reindexAllProducts(): Promise<{ indexed: number; errors: number }> {
    const products = await this.prisma.product.findMany({
      include: { category: true },
    });
    let indexed = 0;
    let errors = 0;
    for (const p of products) {
      try {
        await this.indexProduct(p);
        indexed++;
      } catch {
        errors++;
      }
    }
    return { indexed, errors };
  }

  /**
   * Массовая синхронизация цен поставщика: для всех ProductSupplier с заданной ссылкой
   * получает цену по URL, при изменении обновляет supplierPrice и ставит supplierPriceChangedAt.
   */
  async syncSupplierPrices(): Promise<SyncSupplierPricesResult> {
    const rows = await this.prisma.productSupplier.findMany({
      where: {
        supplierProductUrl: { not: null },
      },
      include: {
        product: { select: { id: true, name: true, categoryId: true } },
      },
    });

    const result: SyncSupplierPricesResult = {
      total: rows.length,
      updated: 0,
      changed: 0,
      errors: [],
    };

    for (const row of rows) {
      const url = row.supplierProductUrl;
      if (!url) continue;

      try {
        const { price: newPrice } = await this.priceScraper.getPriceFromUrl(url, {
          supplierId: row.supplierId,
          categoryId: row.product.categoryId,
        });
        const currentPrice = Number(row.supplierPrice);
        const priceChanged = Math.abs(newPrice - currentPrice) > 0.01;

        await this.prisma.productSupplier.update({
          where: { id: row.id },
          data: {
            supplierPrice: new Prisma.Decimal(newPrice),
            lastSyncAt: new Date(),
            ...(priceChanged && { supplierPriceChangedAt: new Date() }),
          },
        });

        result.updated += 1;
        if (priceChanged) result.changed += 1;
      } catch (err) {
        result.errors.push({
          productId: row.productId,
          productName: row.product.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return result;
  }

  /**
   * Обновить цены поставщика по ссылкам для выбранных товаров.
   * Получает цену по URL, обновляет supplierPrice; при изменении ставит supplierPriceChangedAt.
   * Возвращает changedIds — id товаров, у которых цена изменилась.
   */
  async updateSupplierPrices(productIds: string[]): Promise<UpdateSupplierPricesResult> {
    const rows = await this.prisma.productSupplier.findMany({
      where: {
        productId: { in: productIds },
        isMainSupplier: true,
        supplierProductUrl: { not: null },
      },
      include: {
        product: { select: { id: true, name: true, categoryId: true } },
      },
    });

    const result: UpdateSupplierPricesResult = {
      total: rows.length,
      updated: 0,
      changed: 0,
      changedIds: [],
      errors: [],
    };

    for (const row of rows) {
      const url = row.supplierProductUrl;
      if (!url) continue;

      try {
        const { price: newPrice } = await this.priceScraper.getPriceFromUrl(url, {
          supplierId: row.supplierId,
          categoryId: row.product.categoryId,
        });
        const currentPrice = Number(row.supplierPrice);
        const priceChanged = Math.abs(newPrice - currentPrice) > 0.01;

        await this.prisma.productSupplier.update({
          where: { id: row.id },
          data: {
            supplierPrice: new Prisma.Decimal(newPrice),
            lastSyncAt: new Date(),
            ...(priceChanged && { supplierPriceChangedAt: new Date() }),
          },
        });

        result.updated += 1;
        if (priceChanged) {
          result.changed += 1;
          result.changedIds.push(row.productId);
        }
      } catch (err) {
        result.errors.push({
          productId: row.productId,
          productName: row.product.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return result;
  }

  /**
   * Синхронизация: установить цену товара равной цене поставщика для выбранных товаров.
   */
  async applySupplierPrices(productIds: string[]): Promise<ApplySupplierPricesResult> {
    const rows = await this.prisma.productSupplier.findMany({
      where: {
        productId: { in: productIds },
        isMainSupplier: true,
      },
      include: {
        product: { select: { id: true, name: true } },
      },
    });

    const result: ApplySupplierPricesResult = {
      total: rows.length,
      synced: 0,
      syncedIds: [],
      errors: [],
    };

    for (const row of rows) {
      try {
        const supplierPrice = Number(row.supplierPrice);
        await this.prisma.product.update({
          where: { id: row.productId },
          data: { price: new Prisma.Decimal(supplierPrice) },
        });
        result.synced += 1;
        result.syncedIds.push(row.productId);
      } catch (err) {
        result.errors.push({
          productId: row.productId,
          productName: row.product.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Обновить индексы в Elasticsearch и сбросить supplierPriceChangedAt у синхронизированных
    const syncedIds = result.syncedIds;
    if (syncedIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: syncedIds } },
        include: { category: true },
      });
      for (const p of products) {
        await this.indexProduct(p);
      }
      await this.prisma.productSupplier.updateMany({
        where: { productId: { in: syncedIds }, isMainSupplier: true },
        data: { supplierPriceChangedAt: null },
      });
    }

    return result;
  }
}
