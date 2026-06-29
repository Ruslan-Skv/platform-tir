import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import {
  AdminPublicOffersController,
  PublicOfferLegacyController,
  PublicOffersController,
} from './public-offer.controller';
import { PublicOfferService } from './public-offer.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicOffersController, PublicOfferLegacyController, AdminPublicOffersController],
  providers: [PublicOfferService],
  exports: [PublicOfferService],
})
export class PublicOfferModule {}
