import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderMailService } from './order-mail.service';
import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, CartModule, UsersModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderMailService],
  exports: [OrdersService, OrderMailService],
})
export class OrdersModule {}
