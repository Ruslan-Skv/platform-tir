import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { HomeSectionsController, AdminHomeSectionsController } from './home-sections.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [HomeSectionsController, AdminHomeSectionsController],
})
export class HomeSectionsModule {}
