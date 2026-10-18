import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OdpzhSchedulesController } from './odpzh-schedules.controller';
import { OdpzhSchedulesService } from './odpzh-schedules.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OdpzhSchedulesController],
  providers: [OdpzhSchedulesService],
})
export class OdpzhSchedulesModule {}
