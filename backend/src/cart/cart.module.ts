import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { DatabaseModule } from '../database/database.module';
import { ComponentCatalogKindsModule } from '../products/component-catalog-kinds.module';

@Module({
  imports: [DatabaseModule, ComponentCatalogKindsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
