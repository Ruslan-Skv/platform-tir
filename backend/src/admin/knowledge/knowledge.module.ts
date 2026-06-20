import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AdminNotificationsModule } from '../notifications/admin-notifications.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeMaterialCommentsService } from './services/knowledge-material-comments.service';
import { KnowledgeMaterialLikesService } from './services/knowledge-material-likes.service';
import { KnowledgePlatformFeedbackService } from './services/knowledge-platform-feedback.service';
import { KnowledgeMaterialListService } from './knowledge-material-list.service';
import { KnowledgeQuizService } from './knowledge-quiz.service';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeStructureService } from './knowledge-structure.service';
import { KnowledgeTargetAudienceService } from './knowledge-target-audience.service';
import { KnowledgeTrashService } from './knowledge-trash.service';
import { KnowledgeTrainingAnalyticsService } from './knowledge-training-analytics.service';
import { KnowledgeUploadService } from './knowledge-upload.service';

@Module({
  imports: [DatabaseModule, AdminNotificationsModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    KnowledgeMaterialListService,
    KnowledgeMaterialLikesService,
    KnowledgeMaterialCommentsService,
    KnowledgePlatformFeedbackService,
    KnowledgeQuizService,
    KnowledgeStructureService,
    KnowledgeTargetAudienceService,
    KnowledgeTrashService,
    KnowledgeUploadService,
    KnowledgeTrainingAnalyticsService,
  ],
  exports: [KnowledgeService, KnowledgeQuizService],
})
export class KnowledgeModule {}
