import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { KanbanController } from './kanban.controller';
import { KanbanNotifyService } from './kanban-notify.service';
import { KanbanService } from './kanban.service';

@Module({
  imports: [DatabaseModule, BellPushModule],
  controllers: [KanbanController],
  providers: [KanbanService, KanbanNotifyService],
  exports: [KanbanService],
})
export class KanbanModule {}
