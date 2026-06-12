import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { CatalogFilterBlocksService } from '../catalog-filter-blocks/catalog-filter-blocks.service';
import { ProductsCatalogQueryService } from './products-catalog-query.service';
import { ProductsSearchIndexService } from './products-search-index.service';
import { ProductsSupplierPricesService } from './products-supplier-prices.service';
import { ProductsReadService } from './services/products-read.service';
import { ProductsMutationsService } from './services/products-mutations.service';
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

  const mockCatalogQuery = {
    enrichProductsWithRating: jest.fn((products: unknown[]) => Promise.resolve(products)),
    getCatalogPublicListInclude: jest.fn(() => ({})),
  };

  const mockMutations = {};

  const mockSearchIndex = {
    indexProduct: jest.fn(),
    deleteProduct: jest.fn(),
  };

  const mockSupplierPrices = {};

  const mockCatalogFilterBlocks = {
    getPublicFiltersByCategorySlug: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        ProductsReadService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProductsCatalogQueryService, useValue: mockCatalogQuery },
        { provide: ProductsMutationsService, useValue: mockMutations },
        { provide: ProductsSearchIndexService, useValue: mockSearchIndex },
        { provide: ProductsSupplierPricesService, useValue: mockSupplierPrices },
        { provide: CatalogFilterBlocksService, useValue: mockCatalogFilterBlocks },
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
      mockCatalogQuery.enrichProductsWithRating.mockResolvedValue([product]);
      const result = await service.findOne('prod-1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('prod-1');
      expect(result?.name).toBe('Test Product');
    });
  });
});
