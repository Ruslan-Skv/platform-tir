import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { MoneyMovementsModule } from '../money-movements/money-movements.module';
import { SalaryPayoutsController } from './salary-payouts.controller';
import { SalaryPayoutsService } from './salary-payouts.service';

@Module({
  imports: [DatabaseModule, MoneyMovementsModule],
  controllers: [SalaryPayoutsController],
  providers: [SalaryPayoutsService],
})
export class SalaryPayoutsModule {}
