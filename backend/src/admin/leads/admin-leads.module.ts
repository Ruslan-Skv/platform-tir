import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AdminLeadsController } from './admin-leads.controller';
import { AdminLeadsService } from './admin-leads.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminLeadsController],
  providers: [AdminLeadsService],
  exports: [AdminLeadsService],
})
export class AdminLeadsModule {}
