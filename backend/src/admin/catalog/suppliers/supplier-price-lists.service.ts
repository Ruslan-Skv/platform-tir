import { Injectable } from '@nestjs/common';

import type { SupplierPriceListCategory } from './parsers/price-list-parser.types';
import { SupplierPriceListCompareService } from './services/supplier-price-list-compare.service';
import { SupplierPriceListMappingService } from './services/supplier-price-list-mapping.service';
import { SupplierPriceListUploadService } from './services/supplier-price-list-upload.service';

@Injectable()
export class SupplierPriceListsService {
  constructor(
    private readonly uploadService: SupplierPriceListUploadService,
    private readonly compareService: SupplierPriceListCompareService,
    private readonly mappingService: SupplierPriceListMappingService,
  ) {}

  uploadSnapshot(
    supplierId: string,
    file: Express.Multer.File,
    category?: SupplierPriceListCategory,
    uploadedById?: string,
  ) {
    return this.uploadService.uploadSnapshot(supplierId, file, category, uploadedById);
  }

  uploadAllSnapshots(supplierId: string, file: Express.Multer.File, uploadedById?: string) {
    return this.uploadService.uploadAllSnapshots(supplierId, file, uploadedById);
  }

  listSnapshots(supplierId: string, category?: SupplierPriceListCategory) {
    return this.compareService.listSnapshots(supplierId, category);
  }

  getSnapshot(supplierId: string, snapshotId: string, category?: SupplierPriceListCategory) {
    return this.compareService.getSnapshot(supplierId, snapshotId, category);
  }

  compareSnapshots(
    supplierId: string,
    currentSnapshotId: string,
    previousSnapshotId?: string,
    category?: SupplierPriceListCategory,
  ) {
    return this.compareService.compareSnapshots(
      supplierId,
      currentSnapshotId,
      previousSnapshotId,
      category,
    );
  }

  autoMapRows(supplierId: string, snapshotId?: string, category?: SupplierPriceListCategory) {
    return this.mappingService.autoMapRows(supplierId, snapshotId, category);
  }

  listMappings(supplierId: string) {
    return this.mappingService.listMappings(supplierId);
  }

  saveMapping(supplierId: string, rowKey: string, catalogItemId: string) {
    return this.mappingService.saveMapping(supplierId, rowKey, catalogItemId);
  }

  applyPriceChanges(
    supplierId: string,
    currentSnapshotId: string,
    previousSnapshotId?: string,
    rowKeys?: string[],
    category?: SupplierPriceListCategory,
  ) {
    return this.mappingService.applyPriceChanges(
      supplierId,
      currentSnapshotId,
      previousSnapshotId,
      rowKeys,
      category,
    );
  }
}
