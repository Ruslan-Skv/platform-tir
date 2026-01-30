import { Module } from '@nestjs/common';
import { FooterService } from './footer.service';
import { FooterController, AdminFooterController } from './footer.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FooterController, AdminFooterController],
  providers: [FooterService],
  exports: [FooterService],
})
export class FooterModule {}
