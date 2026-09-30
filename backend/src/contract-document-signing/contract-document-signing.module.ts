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
import { SigningCompletionService } from './finalize/signing-completion.service';
import { SigningPackageMarkerService } from './signing-package-marker.service';
import { ContractDocumentSigningPublicService } from './signing-public-flow.service';
import { SigningStageEffectsService } from './signing-stage-effects.service';
import { SigningStampService } from './finalize/signing-stamp.service';

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
    ContractDocumentSigningPublicService,
    ContractSigningNotifyService,
    SigningStampService,
    SigningCompletionService,
    SigningPackageMarkerService,
    SigningStageEffectsService,
  ],
  exports: [ContractDocumentSigningService],
})
export class ContractDocumentSigningModule {}
