import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AdminSellerLegalController, SellerLegalController } from './seller-legal.controller';
import { SellerLegalService } from './seller-legal.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SellerLegalController, AdminSellerLegalController],
  providers: [SellerLegalService],
  exports: [SellerLegalService],
})
export class SellerLegalModule {}
