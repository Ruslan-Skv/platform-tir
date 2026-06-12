import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderMailService } from './services/order-mail.service';
import { OrdersCartCheckoutService } from './services/orders-cart-checkout.service';
import { OrdersCartServiceLinesService } from './services/orders-cart-service-lines.service';
import { OrdersCartSubmitFlowsService } from './services/orders-cart-submit-flows.service';
import { OrdersCartSubmitForCustomerService } from './services/orders-cart-submit-for-customer.service';
import { OrdersCartSubmitService } from './services/orders-cart-submit.service';
import { OrdersDeliveryService } from './services/orders-delivery.service';
import { OrdersServiceOrdersService } from './services/orders-service-orders.service';
import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, CartModule, UsersModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersDeliveryService,
    OrdersServiceOrdersService,
    OrdersCartCheckoutService,
    OrdersCartServiceLinesService,
    OrdersCartSubmitService,
    OrdersCartSubmitFlowsService,
    OrdersCartSubmitForCustomerService,
    OrderMailService,
  ],
  exports: [OrdersService, OrderMailService],
})
export class OrdersModule {}
