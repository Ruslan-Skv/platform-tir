import { Module } from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrdersController } from './admin-orders.controller';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [AdminOrdersController],
  providers: [AdminOrdersService],
  exports: [AdminOrdersService],
})
export class AdminOrdersModule {}
