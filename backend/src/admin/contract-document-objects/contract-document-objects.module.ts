import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { ContractDocumentObjectsController } from './contract-document-objects.controller';
import { ContractDocumentObjectsService } from './contract-document-objects.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ContractDocumentObjectsController],
  providers: [ContractDocumentObjectsService],
  exports: [ContractDocumentObjectsService],
})
export class ContractDocumentObjectsModule {}
