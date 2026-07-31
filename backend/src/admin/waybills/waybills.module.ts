import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DriverDeliveryAvailabilityService } from './driver-delivery-availability.service';
import { WaybillsController } from './waybills.controller';
import { WaybillsService } from './waybills.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WaybillsController],
  providers: [WaybillsService, DriverDeliveryAvailabilityService],
  exports: [WaybillsService, DriverDeliveryAvailabilityService],
})
export class WaybillsModule {}
