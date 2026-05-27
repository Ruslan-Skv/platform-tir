import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { ContractDocumentPaymentInvoicesService } from './contract-document-payment-invoices.service';
import { ContractDocumentPackagePaymentsService } from './contract-document-package-payments.service';
import { ContractDocumentPackagesController } from './contract-document-packages.controller';
import { ContractDocumentPackagesService } from './contract-document-packages.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ContractDocumentPackagesController],
  providers: [
    ContractDocumentPackagesService,
    ContractDocumentPackagePaymentsService,
    ContractDocumentPaymentInvoicesService,
  ],
  exports: [ContractDocumentPackagesService, ContractDocumentPaymentInvoicesService],
})
export class ContractDocumentPackagesModule {}
