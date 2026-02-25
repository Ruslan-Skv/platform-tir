import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { OriginGuard } from '../common/guards/origin.guard';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [FormsController],
  providers: [FormsService, OriginGuard],
  exports: [FormsService],
})
export class FormsModule {}
