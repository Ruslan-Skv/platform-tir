import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { ContractDocumentPaymentInvoicesService } from './contract-document-payment-invoices.service';
import { ContractDocumentPackagePaymentsService } from './contract-document-package-payments.service';
import { ContractDocumentPackagesController } from './contract-document-packages.controller';
import { ContractDocumentPackagesService } from './contract-document-packages.service';
import { ContractDocumentPackageCrudService } from './contract-document-package-crud.service';
import { ContractDocumentPackageListService } from './list-pipeline/contract-document-package-list.service';
import { ContractDocumentPackageGlobalLibraryService } from './contract-document-package-global-library.service';
import { ContractDocumentPackageEstimatePresetsService } from './contract-document-package-estimate-presets.service';
import { ContractDocumentPackageKindSettingsService } from './contract-document-package-kind-settings.service';
import { ContractDocumentPackageCeilingsPriceListService } from './contract-document-package-ceilings-price-list.service';
import { ContractDocumentNumberingService } from './numbering/contract-document-numbering.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ContractDocumentPackagesController],
  providers: [
    ContractDocumentPackagesService,
    ContractDocumentPackageCrudService,
    ContractDocumentPackageListService,
    ContractDocumentPackageGlobalLibraryService,
    ContractDocumentPackageEstimatePresetsService,
    ContractDocumentPackageKindSettingsService,
    ContractDocumentPackageCeilingsPriceListService,
    ContractDocumentPackagePaymentsService,
    ContractDocumentPaymentInvoicesService,
    ContractDocumentNumberingService,
  ],
  exports: [
    ContractDocumentPackagesService,
    ContractDocumentPaymentInvoicesService,
    ContractDocumentNumberingService,
  ],
})
export class ContractDocumentPackagesModule {}
