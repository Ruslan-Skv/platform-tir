import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { ContractDocumentPackageInstallerAdvancesService } from '../contract-document-packages/payments/contract-document-package-installer-advances.service';
import { InstallerSettlementsController } from './installer-settlements.controller';
import { InstallerSettlementsService } from './installer-settlements.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InstallerSettlementsController],
  providers: [InstallerSettlementsService, ContractDocumentPackageInstallerAdvancesService],
})
export class InstallerSettlementsModule {}
