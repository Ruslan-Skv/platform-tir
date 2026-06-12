import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { HomeSectionsController, AdminHomeSectionsController } from './home-sections.controller';
import { HomeSectionsService } from './home-sections.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HomeSectionsController, AdminHomeSectionsController],
  providers: [HomeSectionsService],
  exports: [HomeSectionsService],
})
export class HomeSectionsModule {}
