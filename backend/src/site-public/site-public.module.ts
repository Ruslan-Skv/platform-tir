import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SitePublicController } from './site-public.controller';
import { SitePublicAdminController } from './site-public-admin.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [SitePublicController, SitePublicAdminController],
})
export class SitePublicModule {}
