import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { ExternalNotifyModule } from '../../external-notify/external-notify.module';
import { DriverDeliveryAvailabilityService } from './driver-delivery-availability.service';
import { WaybillNotifyService } from './waybill-notify.service';
import { WaybillsController } from './waybills.controller';
import { WaybillsService } from './waybills.service';

@Module({
  imports: [DatabaseModule, BellPushModule, ExternalNotifyModule],
  controllers: [WaybillsController],
  providers: [WaybillsService, DriverDeliveryAvailabilityService, WaybillNotifyService],
  exports: [WaybillsService, DriverDeliveryAvailabilityService],
})
export class WaybillsModule {}
