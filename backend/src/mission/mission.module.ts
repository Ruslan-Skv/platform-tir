import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MissionAdminController, MissionPublicController } from './mission.controller';
import { MissionService } from './mission.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MissionPublicController, MissionAdminController],
  providers: [MissionService],
  exports: [MissionService],
})
export class MissionModule {}
