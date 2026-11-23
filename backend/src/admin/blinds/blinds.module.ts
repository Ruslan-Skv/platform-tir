import { Module } from '@nestjs/common';
import { BlindsService } from './blinds.service';
import { BlindsController } from './blinds.controller';
import { BlindsPublicController } from './blinds-public.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BlindsController, BlindsPublicController],
  providers: [BlindsService],
  exports: [BlindsService],
})
export class BlindsModule {}
