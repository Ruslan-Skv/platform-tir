import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsCrudService } from './contracts-crud.service';
import { ContractsCustomersService } from './contracts-customers.service';
import { ContractsHistoryService } from './contracts-history.service';
import { ContractsAmendmentsService } from './contracts-amendments.service';
import { ContractsController } from './contracts.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    ContractsCrudService,
    ContractsCustomersService,
    ContractsHistoryService,
    ContractsAmendmentsService,
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
