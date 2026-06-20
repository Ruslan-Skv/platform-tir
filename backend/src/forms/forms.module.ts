import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { DatabaseModule } from '../database/database.module';
import { BellPushModule } from '../bell-push/bell-push.module';
import { OriginGuard } from '../common/guards/origin.guard';
import { FormNotifierService } from './form-notifier.service';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';

@Module({
  imports: [ConfigModule, DatabaseModule, MailerModule, BellPushModule],
  controllers: [FormsController],
  providers: [FormsService, FormNotifierService, OriginGuard],
  exports: [FormsService],
})
export class FormsModule {}
