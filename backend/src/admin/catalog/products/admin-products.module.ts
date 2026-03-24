import { Module } from '@nestjs/common';
import { AdminProductsService } from './admin-products.service';
import { AdminProductsController } from './admin-products.controller';
import { DatabaseModule } from '../../../database/database.module';
import { ProductsModule } from '../../../products/products.module';

@Module({
  imports: [DatabaseModule, ProductsModule],
  controllers: [AdminProductsController],
  providers: [AdminProductsService],
  exports: [AdminProductsService],
})
export class AdminProductsModule {}
