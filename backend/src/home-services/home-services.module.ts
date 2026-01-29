import { Module } from '@nestjs/common';
import { HomeServicesService } from './home-services.service';
import { HomeServicesController, AdminHomeServicesController } from './home-services.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HomeServicesController, AdminHomeServicesController],
  providers: [HomeServicesService],
  exports: [HomeServicesService],
})
export class HomeServicesModule {}
