import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { WorkDaysModule } from '../work-days/work-days.module';
import { SalarySettingsController } from './salary-settings.controller';
import { SalaryContractsController } from './salary-contracts.controller';
import { SalarySettlementsController } from './salary-settlements.controller';
import { SalaryMyController } from './salary-my.controller';
import { SalarySettingsService } from './services/salary-settings.service';
import { SalaryContractsService } from './services/salary-contracts.service';
import { SalaryContractsSyncService } from './services/salary-contracts-sync.service';
import { SalaryCalculationService } from './services/salary-calculation.service';
import { SalaryBonusesService } from './services/salary-bonuses.service';
import { SalaryEmployeeSalariesService } from './services/salary-employee-salaries.service';
import { SalarySettlementsService } from './services/salary-settlements.service';
import { SalaryMyService } from './services/salary-my.service';

@Module({
  imports: [DatabaseModule, WorkDaysModule],
  controllers: [
    SalarySettingsController,
    SalaryContractsController,
    SalarySettlementsController,
    SalaryMyController,
  ],
  providers: [
    SalarySettingsService,
    SalaryContractsService,
    SalaryContractsSyncService,
    SalaryCalculationService,
    SalaryBonusesService,
    SalaryEmployeeSalariesService,
    SalaryMyService,
    SalarySettlementsService,
  ],
  exports: [SalaryCalculationService, SalaryContractsSyncService],
})
export class SalaryModule {}
