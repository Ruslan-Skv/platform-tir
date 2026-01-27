import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { Category } from '@prisma/client';

type CategoryWithChildren = Category & { children?: CategoryWithChildren[] };

@Injectable()
export class ProductsService {
  private readonly indexName = 'products';

  constructor(
    private prisma: PrismaService,
    private elasticsearch: ElasticsearchService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    // Преобразуем null в пустые массивы для sizes и openingSide
    // В PostgreSQL массивы не могут быть null, только пустые массивы []
    const { supplierId, ...productData } = createProductDto;
    const data: any = { ...productData };
    if (data.sizes === null) {
      data.sizes = [];
    }
    if (data.openingSide === null) {
      data.openingSide = [];
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
          supplierPrice: product.price,
          supplierStock: product.stock || 0,
          isMainSupplier: true,
        },
        update: {
          isMainSupplier: true,
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

    return product;
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

    return product;
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
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
      products,
      total: products.length,
    };
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
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return {
      category: {
        id: 'all',
        name: 'Каталог товаров',
        slug: 'all',
        description: 'Все товары',
      },
      products,
      total: products.length,
    };
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

    return {
      products: orderedProducts,
      total: result.body.hits.total.value,
      page,
      limit,
      totalPages: Math.ceil(result.body.hits.total.value / limit),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(id);

    // Для JSON поля attributes нужна полная замена, а не merge
    // Если attributes передан (даже пустой объект), заменяем полностью
    const { supplierId, ...productData } = updateProductDto;
    const data: any = { ...productData };
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

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });

    // Обработка поставщика
    if ('supplierId' in updateProductDto) {
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
            supplierPrice: product.price,
            supplierStock: product.stock || 0,
            isMainSupplier: true,
          },
          update: {
            isMainSupplier: true,
          },
        });
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
}
