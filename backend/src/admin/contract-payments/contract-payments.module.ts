import { Module } from '@nestjs/common';
import { ContractPaymentsService } from './contract-payments.service';
import { ContractPaymentsController } from './contract-payments.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ContractPaymentsController],
  providers: [ContractPaymentsService],
  exports: [ContractPaymentsService],
})
export class ContractPaymentsModule {}
