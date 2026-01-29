import { Module } from '@nestjs/common';
import { AdvantagesService } from './advantages.service';
import { AdvantagesController, AdminAdvantagesController } from './advantages.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdvantagesController, AdminAdvantagesController],
  providers: [AdvantagesService],
  exports: [AdvantagesService],
})
export class AdvantagesModule {}
