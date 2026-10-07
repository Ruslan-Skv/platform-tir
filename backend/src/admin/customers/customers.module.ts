import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersDirectoryService } from './customers-directory.service';
import { CustomersCrmService } from './customers-crm.service';
import { CustomersDuplicatesService } from './customers-duplicates.service';
import { CustomersController } from './customers.controller';
import { DatabaseModule } from '../../database/database.module';
import { ContractDocumentPackageEstimatePresetsService } from '../contract-document-packages/contract-document-package-estimate-presets.service';
import { ContractDocumentPackageCustomerSyncService } from '../contract-document-packages/customer-sync/contract-document-package-customer-sync.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomersDirectoryService,
    CustomersCrmService,
    CustomersDuplicatesService,
    // Синхронизация данных заказчика из карточки CRM в расчёты и пакеты документов;
    // сервисам нужен только Prisma, поэтому подключены напрямую, без тяжёлого модуля пакетов.
    ContractDocumentPackageEstimatePresetsService,
    ContractDocumentPackageCustomerSyncService,
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
