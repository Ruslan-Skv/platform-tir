import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ContractDocumentNumberAssignmentsService } from './contract-document-number-assignments.service';
import { ContractDocumentNumberHoldsService } from './contract-document-number-holds.service';
import { ContractDocumentNumberingService } from './contract-document-numbering.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    ContractDocumentNumberAssignmentsService,
    ContractDocumentNumberHoldsService,
    ContractDocumentNumberingService,
  ],
  exports: [ContractDocumentNumberingService],
})
export class ContractDocumentNumberingModule {}
