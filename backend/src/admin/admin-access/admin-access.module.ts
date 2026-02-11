import { Module } from '@nestjs/common';
import { AdminAccessController } from './admin-access.controller';
import { AdminAccessService } from './admin-access.service';

@Module({
  controllers: [AdminAccessController],
  providers: [AdminAccessService],
  exports: [AdminAccessService],
})
export class AdminAccessModule {}
