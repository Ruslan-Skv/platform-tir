import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductComponentsService } from './product-components.service';
import { ProductComponentsController } from './product-components.controller';
import { PriceScraperService } from './price-scraper.service';

@Module({
  controllers: [ProductsController, ProductComponentsController],
  providers: [ProductsService, ProductComponentsService, PriceScraperService],
  exports: [ProductsService, ProductComponentsService, PriceScraperService],
})
export class ProductsModule {}
