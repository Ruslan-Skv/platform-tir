import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import type { CatalogFiltersResponseDto } from '../catalog-filter-blocks/dto/public-filters.dto';
import { ProductsCatalogQueryService } from './products-catalog-query.service';
import { ProductsSearchIndexService } from './products-search-index.service';
import { ProductsSupplierPricesService } from './products-supplier-prices.service';
import { ProductsReadService } from './services/products-read.service';
import { ProductsMutationsService } from './services/products-mutations.service';

export type {
  SyncSupplierPricesResult,
  UpdateSupplierPricesResult,
  ApplySupplierPricesResult,
} from './products-supplier-prices.service';

export type {
  CatalogFilterFacetDto,
  CatalogFilterOptionDto,
  CatalogFiltersResponseDto,
} from '../catalog-filter-blocks/dto/public-filters.dto';

@Injectable()
export class ProductsService {
  constructor(
    private read: ProductsReadService,
    private mutations: ProductsMutationsService,
    private catalogQuery: ProductsCatalogQueryService,
    private searchIndex: ProductsSearchIndexService,
    private supplierPrices: ProductsSupplierPricesService,
  ) {}

  create(createProductDto: CreateProductDto, userId?: string) {
    return this.mutations.create(createProductDto, userId);
  }

  findAll() {
    return this.read.findAll();
  }

  findAllAdmin() {
    return this.read.findAllAdmin();
  }

  getSizesByCategoryId(categoryId: string) {
    return this.read.getSizesByCategoryId(categoryId);
  }

  getAttributeValuesByCategoryId(categoryId: string) {
    return this.read.getAttributeValuesByCategoryId(categoryId);
  }

  findOne(id: string) {
    return this.read.findOne(id);
  }

  findManyActiveByIdsForCompare(ids: string[]) {
    return this.read.findManyActiveByIdsForCompare(ids);
  }

  findManyActiveByIdsForWishlist(ids: string[]) {
    return this.read.findManyActiveByIdsForWishlist(ids);
  }

  findBySlug(slug: string) {
    return this.read.findBySlug(slug);
  }

  update(id: string, updateProductDto: UpdateProductDto, userId?: string) {
    return this.mutations.update(id, updateProductDto, userId);
  }

  remove(id: string) {
    return this.mutations.remove(id);
  }

  findByCategory(categorySlug: string, search?: string) {
    return this.catalogQuery.findByCategory(categorySlug, search);
  }

  findCategoryFilters(categorySlug: string): Promise<CatalogFiltersResponseDto> {
    return this.catalogQuery.findCategoryFilters(categorySlug);
  }

  findFeatured(
    limit = 8,
    primaryFilter: 'featured' | 'new' | 'featured_or_new' | 'any' = 'featured',
    secondaryOrder: 'sort_order' | 'created_desc' = 'sort_order',
  ) {
    return this.catalogQuery.findFeatured(limit, primaryFilter, secondaryOrder);
  }

  search(searchDto: SearchProductsDto) {
    return this.catalogQuery.search(searchDto);
  }

  searchSuggestions(rawQuery: string, limit = 8) {
    return this.catalogQuery.searchSuggestions(rawQuery, limit);
  }

  reindexAllProducts() {
    return this.searchIndex.reindexAllProducts();
  }

  syncSupplierPrices() {
    return this.supplierPrices.syncSupplierPrices();
  }

  updateSupplierPrices(productIds: string[]) {
    return this.supplierPrices.updateSupplierPrices(productIds);
  }

  applySupplierPrices(productIds: string[]) {
    return this.supplierPrices.applySupplierPrices(productIds);
  }
}
