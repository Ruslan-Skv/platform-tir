import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { ContractDocumentPaymentInvoicesService } from './contract-document-payment-invoices.service';
import { ContractDocumentPackagePaymentsService } from './contract-document-package-payments.service';
import { ContractDocumentPackagesController } from './contract-document-packages.controller';
import { ContractDocumentPackagesService } from './contract-document-packages.service';
import { ContractDocumentPackageCrudService } from './contract-document-package-crud.service';
import { ContractDocumentPackageGlobalLibraryService } from './contract-document-package-global-library.service';
import { ContractDocumentPackageEstimatePresetsService } from './contract-document-package-estimate-presets.service';
import { ContractDocumentPackageKindSettingsService } from './contract-document-package-kind-settings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ContractDocumentPackagesController],
  providers: [
    ContractDocumentPackagesService,
    ContractDocumentPackageCrudService,
    ContractDocumentPackageGlobalLibraryService,
    ContractDocumentPackageEstimatePresetsService,
    ContractDocumentPackageKindSettingsService,
    ContractDocumentPackagePaymentsService,
    ContractDocumentPaymentInvoicesService,
  ],
  exports: [ContractDocumentPackagesService, ContractDocumentPaymentInvoicesService],
})
export class ContractDocumentPackagesModule {}
