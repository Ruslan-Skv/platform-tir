import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SitePublicController } from './site-public.controller';
import { SitePublicAdminController } from './site-public-admin.controller';
import { SiteDecorationsAdminController } from './site-decorations-admin.controller';
import { SitePublicService } from './site-public.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SitePublicController, SitePublicAdminController, SiteDecorationsAdminController],
  providers: [SitePublicService],
  exports: [SitePublicService],
})
export class SitePublicModule {}
