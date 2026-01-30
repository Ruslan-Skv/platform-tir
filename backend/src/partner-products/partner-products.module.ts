import { Module } from '@nestjs/common';
import { PartnerProductsService } from './partner-products.service';
import {
  PartnerProductsController,
  AdminPartnerProductsController,
} from './partner-products.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PartnerProductsController, AdminPartnerProductsController],
  providers: [PartnerProductsService],
  exports: [PartnerProductsService],
})
export class PartnerProductsModule {}
