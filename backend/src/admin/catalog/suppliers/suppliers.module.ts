import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { SupplierPriceListsController } from './supplier-price-lists.controller';
import { SupplierPriceListsService } from './supplier-price-lists.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SuppliersController, SupplierPriceListsController],
  providers: [SuppliersService, SupplierPriceListsService],
  exports: [SuppliersService, SupplierPriceListsService],
})
export class SuppliersModule {}
