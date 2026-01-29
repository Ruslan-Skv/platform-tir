import { Module } from '@nestjs/common';
import {
  HomeDirectionsController,
  AdminHomeDirectionsController,
} from './home-directions.controller';
import { HomeDirectionsService } from './home-directions.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HomeDirectionsController, AdminHomeDirectionsController],
  providers: [HomeDirectionsService],
  exports: [HomeDirectionsService],
})
export class HomeDirectionsModule {}
