import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeQuizService } from './knowledge-quiz.service';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeStructureService } from './knowledge-structure.service';
import { KnowledgeTargetAudienceService } from './knowledge-target-audience.service';
import { KnowledgeUploadService } from './knowledge-upload.service';

@Module({
  imports: [DatabaseModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    KnowledgeQuizService,
    KnowledgeStructureService,
    KnowledgeTargetAudienceService,
    KnowledgeUploadService,
  ],
  exports: [KnowledgeService, KnowledgeQuizService],
})
export class KnowledgeModule {}
