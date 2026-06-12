import { Injectable } from '@nestjs/common';
import { AdminProductsQueryService } from './services/admin-products-query.service';
import { AdminProductsBulkService } from './services/admin-products-bulk.service';
import { AdminProductsImportService } from './services/admin-products-import.service';
import { AdminProductsReviewsService } from './services/admin-products-reviews.service';
import type { BulkUpdateDto, ImportProductDto } from './admin-products-shared';

export type { BulkUpdateDto, ImportProductDto };

@Injectable()
export class AdminProductsService {
  constructor(
    private query: AdminProductsQueryService,
    private bulk: AdminProductsBulkService,
    private importService: AdminProductsImportService,
    private reviews: AdminProductsReviewsService,
  ) {}

  findAll(params?: Parameters<AdminProductsQueryService['findAll']>[0]) {
    return this.query.findAll(params);
  }

  getProductAuthors() {
    return this.query.getProductAuthors();
  }

  findOne(id: string) {
    return this.query.findOne(id);
  }

  getStats() {
    return this.query.getStats();
  }

  bulkUpdate(bulkUpdateDto: BulkUpdateDto) {
    return this.bulk.bulkUpdate(bulkUpdateDto);
  }

  bulkDelete(ids: string[]) {
    return this.bulk.bulkDelete(ids);
  }

  bulkActivate(ids: string[], isActive: boolean) {
    return this.bulk.bulkActivate(ids, isActive);
  }

  bulkUpdatePrices(updates: { id: string; price?: number; comparePrice?: number }[]) {
    return this.bulk.bulkUpdatePrices(updates);
  }

  bulkUpdateStock(updates: { id: string; stock: number }[]) {
    return this.bulk.bulkUpdateStock(updates);
  }

  importProducts(products: ImportProductDto[]) {
    return this.bulk.importProducts(products);
  }

  exportProducts(params?: Parameters<AdminProductsBulkService['exportProducts']>[0]) {
    return this.bulk.exportProducts(params);
  }

  getReviews(productId: string, page = 1, limit = 20) {
    return this.reviews.getReviews(productId, page, limit);
  }

  approveReview(reviewId: string) {
    return this.reviews.approveReview(reviewId);
  }

  deleteReview(reviewId: string) {
    return this.reviews.deleteReview(reviewId);
  }

  importFromFile(fileBuffer: Buffer, filename: string, categoryId: string, skuPrefix?: string) {
    return this.importService.importFromFile(fileBuffer, filename, categoryId, skuPrefix);
  }

  previewImportFile(filePath: string) {
    return this.importService.previewImportFile(filePath);
  }
}
