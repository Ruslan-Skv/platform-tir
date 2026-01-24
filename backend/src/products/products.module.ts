import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductComponentsService } from './product-components.service';
import { ProductComponentsController } from './product-components.controller';

@Module({
  controllers: [ProductsController, ProductComponentsController],
  providers: [ProductsService, ProductComponentsService],
  exports: [ProductsService, ProductComponentsService],
})
export class ProductsModule {}
