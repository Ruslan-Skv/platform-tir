import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { PriceScraperService } from './price-scraper.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockPrisma = {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    review: { groupBy: jest.fn().mockResolvedValue([]) },
  };

  const mockElasticsearch = {
    search: jest.fn(),
    createIndex: jest.fn(),
    deleteDocument: jest.fn(),
  };

  const mockPriceScraper = { getPriceFromUrl: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ElasticsearchService, useValue: mockElasticsearch },
        { provide: PriceScraperService, useValue: mockPriceScraper },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findOne', () => {
    it('выбрасывает NotFoundException, если товар не найден', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Product with ID non-existent-id not found',
      );
    });

    it('возвращает товар при найденном id', async () => {
      const product = {
        id: 'prod-1',
        name: 'Test Product',
        slug: 'test-product',
        price: 1000,
        category: { id: 'cat-1', name: 'Category' },
        reviews: [],
        suppliers: [],
        cardVariants: [],
      };
      mockPrisma.product.findUnique.mockResolvedValue(product);
      const result = await service.findOne('prod-1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('prod-1');
      expect(result?.name).toBe('Test Product');
    });
  });
});
