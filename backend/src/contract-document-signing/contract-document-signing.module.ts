import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';

import { DatabaseModule } from '../database/database.module';
import { BellPushModule } from '../bell-push/bell-push.module';
import { ContractDocumentNumberingModule } from '../contract-document-numbering/contract-document-numbering.module';
import { ContractConcludedNotifyModule } from '../contract-concluded-notify/contract-concluded-notify.module';
import { ContractDocumentSigningAdminController } from './contract-document-signing-admin.controller';
import { ContractDocumentSigningPublicController } from './contract-document-signing-public.controller';
import { ContractDocumentSigningService } from './contract-document-signing.service';
import { ContractSigningNotifyService } from './contract-signing-notify.service';
import { SigningCompletionService } from './signing-completion.service';
import { SigningPackageMarkerService } from './signing-package-marker.service';
import { SigningStampService } from './signing-stamp.service';

@Module({
  imports: [
    DatabaseModule,
    BellPushModule,
    MailerModule,
    ContractDocumentNumberingModule,
    ContractConcludedNotifyModule,
  ],
  controllers: [ContractDocumentSigningPublicController, ContractDocumentSigningAdminController],
  providers: [
    ContractDocumentSigningService,
    ContractSigningNotifyService,
    SigningStampService,
    SigningCompletionService,
    SigningPackageMarkerService,
  ],
  exports: [ContractDocumentSigningService],
})
export class ContractDocumentSigningModule {}
