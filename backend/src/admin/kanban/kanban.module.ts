import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { KanbanController } from './kanban.controller';
import { KanbanService } from './kanban.service';

@Module({
  imports: [DatabaseModule],
  controllers: [KanbanController],
  providers: [KanbanService],
  exports: [KanbanService],
})
export class KanbanModule {}
