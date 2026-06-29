import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import {
  AdminSiteDisclaimerController,
  SiteDisclaimerController,
} from './site-disclaimer.controller';
import { SiteDisclaimerService } from './site-disclaimer.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SiteDisclaimerController, AdminSiteDisclaimerController],
  providers: [SiteDisclaimerService],
  exports: [SiteDisclaimerService],
})
export class SiteDisclaimerModule {}
