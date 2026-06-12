import { Injectable } from '@nestjs/common';
import { CreateServiceCatalogCategoryDto } from './dto/create-service-catalog-category.dto';
import { UpdateServiceCatalogCategoryDto } from './dto/update-service-catalog-category.dto';
import { CreateServiceCatalogItemDto } from './dto/create-service-catalog-item.dto';
import { UpdateServiceCatalogItemDto } from './dto/update-service-catalog-item.dto';
import { UpdateServiceCatalogBlockDto } from './dto/update-service-catalog-block.dto';
import { ServiceCatalogBlockService } from './service-catalog-block.service';
import { ServiceCatalogCategoriesService } from './service-catalog-categories.service';
import { ServiceCatalogItemsService } from './service-catalog-items.service';
import { ServiceCatalogPublicService } from './service-catalog-public.service';

@Injectable()
export class ServiceCatalogService {
  constructor(
    private block: ServiceCatalogBlockService,
    private categories: ServiceCatalogCategoriesService,
    private items: ServiceCatalogItemsService,
    private catalogPublic: ServiceCatalogPublicService,
  ) {}

  getBlock() {
    return this.block.getBlock();
  }

  updateBlock(dto: UpdateServiceCatalogBlockDto) {
    return this.block.updateBlock(dto);
  }

  createCategory(dto: CreateServiceCatalogCategoryDto) {
    return this.categories.createCategory(dto);
  }

  findAllCategories(includeInactive = false) {
    return this.categories.findAllCategories(includeInactive);
  }

  reorderCategoryAmongSiblings(
    categoryId: string,
    direction: 'up' | 'down',
    includeInactive = true,
  ) {
    return this.categories.reorderCategoryAmongSiblings(categoryId, direction, includeInactive);
  }

  findCategoryById(id: string) {
    return this.categories.findCategoryById(id);
  }

  findCategoryBySlug(slug: string) {
    return this.categories.findCategoryBySlug(slug);
  }

  updateCategory(id: string, dto: UpdateServiceCatalogCategoryDto) {
    return this.categories.updateCategory(id, dto);
  }

  removeCategory(id: string) {
    return this.categories.removeCategory(id);
  }

  createItem(dto: CreateServiceCatalogItemDto) {
    return this.items.createItem(dto);
  }

  findAllItems(params?: Parameters<ServiceCatalogItemsService['findAllItems']>[0]) {
    return this.items.findAllItems(params);
  }

  findItemById(id: string) {
    return this.items.findItemById(id);
  }

  updateItem(id: string, dto: UpdateServiceCatalogItemDto) {
    return this.items.updateItem(id, dto);
  }

  removeItem(id: string) {
    return this.items.removeItem(id);
  }

  getPublicCatalog() {
    return this.catalogPublic.getPublicCatalog();
  }

  getPublicCategoryBySlug(slug: string) {
    return this.catalogPublic.getPublicCategoryBySlug(slug);
  }

  calculateTotal(items: { itemId: string; quantity: number }[]) {
    return this.catalogPublic.calculateTotal(items);
  }
}
