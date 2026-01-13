import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';

@Injectable()
export class ProductsService {
  private readonly indexName = 'products';

  constructor(
    private prisma: PrismaService,
    private elasticsearch: ElasticsearchService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: createProductDto,
      include: {
        category: true,
      },
    });

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
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
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
        category: true,
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

  async search(searchDto: SearchProductsDto) {
    const { query, category, minPrice, maxPrice, page = 1, limit = 20 } = searchDto;
    const from = (page - 1) * limit;

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
      const range: any = {};
      if (minPrice) range.gte = minPrice;
      if (maxPrice) range.lte = maxPrice;
      searchQuery.query.bool.must.push({ range: { price: range } });
    }

    const result = await this.elasticsearch.search(this.indexName, searchQuery);

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
    const product = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: true,
      },
    });

    // Update in Elasticsearch
    await this.indexProduct(product);

    return product;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({
      where: { id },
    });

    // Remove from Elasticsearch
    await this.elasticsearch.deleteDocument(this.indexName, id);
  }

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
