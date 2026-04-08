import { Module } from '@nestjs/common';
import { WeatherstripsService } from './weatherstrips.service';
import { WeatherstripsController } from './weatherstrips.controller';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WeatherstripsController],
  providers: [WeatherstripsService],
  exports: [WeatherstripsService],
})
export class WeatherstripsModule {}
