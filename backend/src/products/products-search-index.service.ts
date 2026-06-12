import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

@Injectable()
export class ProductsSearchIndexService {
  private readonly indexName = 'products';

  constructor(
    private prisma: PrismaService,
    private elasticsearch: ElasticsearchService,
  ) {}

  async indexProduct(product: any) {
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

  async deleteProduct(id: string) {
    await this.elasticsearch.deleteDocument(this.indexName, id);
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
}
