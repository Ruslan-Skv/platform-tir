import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { ContractDocumentPackagesController } from './contract-document-packages.controller';
import { ContractDocumentPackagesService } from './contract-document-packages.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ContractDocumentPackagesController],
  providers: [ContractDocumentPackagesService],
  exports: [ContractDocumentPackagesService],
})
export class ContractDocumentPackagesModule {}
