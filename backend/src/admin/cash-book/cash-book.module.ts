import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { MoneyMovementsModule } from '../money-movements/money-movements.module';
import { CashBookController } from './cash-book.controller';
import { CashBookService } from './cash-book.service';

@Module({
  imports: [DatabaseModule, MoneyMovementsModule],
  controllers: [CashBookController],
  providers: [CashBookService],
})
export class CashBookModule {}
