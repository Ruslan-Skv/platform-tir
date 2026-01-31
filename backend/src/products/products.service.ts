import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { PriceScraperService } from './price-scraper.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { Category, Prisma } from '@prisma/client';

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
  ) {}

  async create(createProductDto: CreateProductDto) {
    // Поля поставщика и партнёра — исключаем из data для prisma.product.create
    const { supplierId, supplierProductUrl, supplierPrice, categoryId, partnerId, ...productData } =
      createProductDto;
    const data: Prisma.ProductCreateInput = {
      ...productData,
      category: {
        connect: { id: categoryId },
      },
    };
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
      },
    });

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
          supplierSku: product.sku || '',
          supplierPrice: supplierPrice ? new Prisma.Decimal(supplierPrice) : product.price,
          supplierProductUrl: supplierProductUrl || null,
          supplierStock: product.stock || 0,
          isMainSupplier: true,
        },
        update: {
          isMainSupplier: true,
          ...(supplierPrice !== undefined && { supplierPrice: new Prisma.Decimal(supplierPrice) }),
          ...(supplierProductUrl !== undefined && {
            supplierProductUrl: supplierProductUrl || null,
          }),
        },
      });
    }

    // Index in Elasticsearch
    await this.indexProduct(product);

    return product;
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
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const [enriched] = await this.enrichProductsWithRating([product]);
    return enriched ?? product;
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
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }

    const [enriched] = await this.enrichProductsWithRating([product]);
    return enriched ?? product;
  }

  async findByCategory(categorySlug: string) {
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

    // Получаем товары из этой категории и всех дочерних
    const products = await this.prisma.product.findMany({
      where: {
        categoryId: { in: categoryIds },
        isActive: true,
      },
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
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

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

  // Получить все товары (для страницы "Каталог товаров")
  async findAllProducts() {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
      },
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
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const enrichedProducts = await this.enrichProductsWithRating(products);
    return {
      category: {
        id: 'all',
        name: 'Каталог товаров',
        slug: 'all',
        description: 'Все товары',
      },
      products: enrichedProducts,
      total: products.length,
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productIds = result.body.hits.hits.map((hit: any) => hit._id);
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
      total: result.body.hits.total.value,
      page,
      limit,
      totalPages: Math.ceil(result.body.hits.total.value / limit),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(id);

    // Поля поставщика и партнёра — исключаем из data для prisma.product.update
    const { supplierId, supplierProductUrl, supplierPrice, categoryId, partnerId, ...productData } =
      updateProductDto;
    const data: Prisma.ProductUpdateInput = { ...productData };

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
      },
    });

    // Обработка поставщика
    if (
      'supplierId' in updateProductDto ||
      'supplierProductUrl' in updateProductDto ||
      'supplierPrice' in updateProductDto
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
            supplierSku: product.sku || '',
            supplierPrice: supplierPrice ? new Prisma.Decimal(supplierPrice) : product.price,
            supplierProductUrl: supplierProductUrl || null,
            supplierStock: product.stock || 0,
            isMainSupplier: true,
          },
          update: {
            isMainSupplier: true,
            ...(supplierPrice !== undefined && {
              supplierPrice: new Prisma.Decimal(supplierPrice),
            }),
            ...(supplierProductUrl !== undefined && {
              supplierProductUrl: supplierProductUrl || null,
            }),
          },
        });
      } else if (supplierProductUrl !== undefined || supplierPrice !== undefined) {
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

    // Update in Elasticsearch
    await this.indexProduct(product);

    return product;
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
   * Массовая синхронизация цен поставщика: для всех ProductSupplier с заданной ссылкой
   * получает цену по URL, при изменении обновляет supplierPrice и ставит supplierPriceChangedAt.
   */
  async syncSupplierPrices(): Promise<SyncSupplierPricesResult> {
    const rows = await this.prisma.productSupplier.findMany({
      where: {
        supplierProductUrl: { not: null },
      },
      include: {
        product: { select: { id: true, name: true } },
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
        const newPrice = await this.priceScraper.getPriceFromUrl(url);
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
        product: { select: { id: true, name: true } },
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
        const newPrice = await this.priceScraper.getPriceFromUrl(url);
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
