import { Module } from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrdersQueryService } from './admin-orders-query.service';
import { AdminOrdersMutationsService } from './admin-orders-mutations.service';
import { AdminOrdersDeliverySettingsService } from './admin-orders-delivery-settings.service';
import { AdminOrdersController } from './admin-orders.controller';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { OrdersModule } from '../../orders/orders.module';

@Module({
  imports: [DatabaseModule, UsersModule, OrdersModule],
  controllers: [AdminOrdersController],
  providers: [
    AdminOrdersService,
    AdminOrdersQueryService,
    AdminOrdersMutationsService,
    AdminOrdersDeliverySettingsService,
  ],
  exports: [AdminOrdersService],
})
export class AdminOrdersModule {}
