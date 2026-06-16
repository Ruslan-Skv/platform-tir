import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeQuizService } from './knowledge-quiz.service';
import { KnowledgeService } from './knowledge.service';

@Module({
  imports: [DatabaseModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeQuizService],
  exports: [KnowledgeService, KnowledgeQuizService],
})
export class KnowledgeModule {}
