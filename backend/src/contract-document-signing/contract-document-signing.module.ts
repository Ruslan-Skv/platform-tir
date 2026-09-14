import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';

import { DatabaseModule } from '../database/database.module';
import { BellPushModule } from '../bell-push/bell-push.module';
import { ContractDocumentNumberingModule } from '../contract-document-numbering/contract-document-numbering.module';
import { ContractDocumentSigningAdminController } from './contract-document-signing-admin.controller';
import { ContractDocumentSigningPublicController } from './contract-document-signing-public.controller';
import { ContractDocumentSigningService } from './contract-document-signing.service';
import { ContractSigningNotifyService } from './contract-signing-notify.service';

@Module({
  imports: [DatabaseModule, BellPushModule, MailerModule, ContractDocumentNumberingModule],
  controllers: [ContractDocumentSigningPublicController, ContractDocumentSigningAdminController],
  providers: [ContractDocumentSigningService, ContractSigningNotifyService],
  exports: [ContractDocumentSigningService],
})
export class ContractDocumentSigningModule {}
