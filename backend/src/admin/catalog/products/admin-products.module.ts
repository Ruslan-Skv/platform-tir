import { Module } from '@nestjs/common';
import { AdminProductsService } from './admin-products.service';
import { AdminProductsQueryService } from './services/admin-products-query.service';
import { AdminProductsBulkService } from './services/admin-products-bulk.service';
import { AdminProductsImportService } from './services/admin-products-import.service';
import { AdminProductsReviewsService } from './services/admin-products-reviews.service';
import { StroykomHandlesImportService } from './services/stroykom-handles-import.service';
import { MaxidoorsHandlesImportService } from './services/maxidoors-handles-import.service';
import { MaxidoorsImportService } from './services/maxidoors-import.service';
import { AdminProductsController } from './admin-products.controller';
import { DatabaseModule } from '../../../database/database.module';
import { ProductsModule } from '../../../products/products.module';

@Module({
  imports: [DatabaseModule, ProductsModule],
  controllers: [AdminProductsController],
  providers: [
    AdminProductsService,
    AdminProductsQueryService,
    AdminProductsBulkService,
    AdminProductsImportService,
    AdminProductsReviewsService,
    StroykomHandlesImportService,
    MaxidoorsImportService,
    MaxidoorsHandlesImportService,
  ],
  exports: [
    AdminProductsService,
    StroykomHandlesImportService,
    MaxidoorsImportService,
    MaxidoorsHandlesImportService,
  ],
})
export class AdminProductsModule {}
