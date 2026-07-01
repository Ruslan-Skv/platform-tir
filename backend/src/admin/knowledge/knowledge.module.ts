import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ExternalNotifyModule } from '../../external-notify/external-notify.module';
import { AdminAccessModule } from '../admin-access/admin-access.module';
import { AdminNotificationsModule } from '../notifications/admin-notifications.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeMaterialCommentsService } from './services/knowledge-material-comments.service';
import { KnowledgeTrainingNotifyService } from './services/knowledge-training-notify.service';
import { KnowledgeMaterialEngagementService } from './services/knowledge-material-engagement.service';
import { KnowledgeMaterialFavoritesService } from './services/knowledge-material-favorites.service';
import { KnowledgeSequentialAccessService } from './services/knowledge-sequential-access.service';
import { KnowledgeMaterialLikesService } from './services/knowledge-material-likes.service';
import { KnowledgePlatformFeedbackService } from './services/knowledge-platform-feedback.service';
import { KnowledgeMaterialListService } from './knowledge-material-list.service';
import { KnowledgeQuizService } from './knowledge-quiz.service';
import { KnowledgeCategoryQuizService } from './services/knowledge-category-quiz.service';
import { KnowledgePlatformSettingsService } from './services/knowledge-platform-settings.service';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeStructureService } from './knowledge-structure.service';
import { KnowledgeTargetAudienceService } from './knowledge-target-audience.service';
import { KnowledgeTrashService } from './knowledge-trash.service';
import { KnowledgeTrainingAnalyticsService } from './knowledge-training-analytics.service';
import { KnowledgeMyTrainingProgressService } from './services/knowledge-my-training-progress.service';
import { KnowledgeUploadService } from './knowledge-upload.service';

@Module({
  imports: [DatabaseModule, AdminNotificationsModule, AdminAccessModule, ExternalNotifyModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    KnowledgeMaterialListService,
    KnowledgeMaterialLikesService,
    KnowledgeMaterialFavoritesService,
    KnowledgeMaterialEngagementService,
    KnowledgeSequentialAccessService,
    KnowledgeMaterialCommentsService,
    KnowledgeTrainingNotifyService,
    KnowledgePlatformFeedbackService,
    KnowledgeQuizService,
    KnowledgeCategoryQuizService,
    KnowledgePlatformSettingsService,
    KnowledgeStructureService,
    KnowledgeTargetAudienceService,
    KnowledgeTrashService,
    KnowledgeUploadService,
    KnowledgeTrainingAnalyticsService,
    KnowledgeMyTrainingProgressService,
  ],
  exports: [KnowledgeService, KnowledgeQuizService],
})
export class KnowledgeModule {}
