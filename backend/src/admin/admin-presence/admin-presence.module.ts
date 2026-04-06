import { Module } from '@nestjs/common';
import { AdminPresenceController } from './admin-presence.controller';
import { AdminPresenceService } from './admin-presence.service';

@Module({
  controllers: [AdminPresenceController],
  providers: [AdminPresenceService],
  exports: [AdminPresenceService],
})
export class AdminPresenceModule {}
