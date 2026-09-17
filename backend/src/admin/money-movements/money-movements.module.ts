import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { MoneyMovementsController } from './money-movements.controller';
import { MoneyMovementsService } from './money-movements.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MoneyMovementsController],
  providers: [MoneyMovementsService],
  exports: [MoneyMovementsService],
})
export class MoneyMovementsModule {}
