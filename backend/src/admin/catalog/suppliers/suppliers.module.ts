import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { SupplierPriceListsController } from './supplier-price-lists.controller';
import { SupplierPriceListsService } from './supplier-price-lists.service';
import { SupplierPriceListCompareService } from './services/supplier-price-list-compare.service';
import { SupplierPriceListMappingService } from './services/supplier-price-list-mapping.service';
import { SupplierPriceListUploadService } from './services/supplier-price-list-upload.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SuppliersController, SupplierPriceListsController],
  providers: [
    SuppliersService,
    SupplierPriceListsService,
    SupplierPriceListUploadService,
    SupplierPriceListCompareService,
    SupplierPriceListMappingService,
  ],
  exports: [SuppliersService, SupplierPriceListsService],
})
export class SuppliersModule {}
