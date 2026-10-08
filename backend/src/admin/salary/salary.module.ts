import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SalarySettingsController } from './salary-settings.controller';
import { SalaryContractsController } from './salary-contracts.controller';
import { SalarySettlementsController } from './salary-settlements.controller';
import { SalarySettingsService } from './salary-settings.service';
import { SalaryContractsService } from './salary-contracts.service';
import { SalaryCalculationService } from './salary-calculation.service';
import { SalarySettlementsService } from './salary-settlements.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SalarySettingsController, SalaryContractsController, SalarySettlementsController],
  providers: [
    SalarySettingsService,
    SalaryContractsService,
    SalaryCalculationService,
    SalarySettlementsService,
  ],
  exports: [SalaryCalculationService],
})
export class SalaryModule {}
