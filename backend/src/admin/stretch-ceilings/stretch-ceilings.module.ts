import { Module } from '@nestjs/common';
import { StretchCeilingsService } from './stretch-ceilings.service';
import { StretchCeilingsController } from './stretch-ceilings.controller';
import { StretchCeilingsPublicController } from './stretch-ceilings-public.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [StretchCeilingsController, StretchCeilingsPublicController],
  providers: [StretchCeilingsService],
  exports: [StretchCeilingsService],
})
export class StretchCeilingsModule {}
