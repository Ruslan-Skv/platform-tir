import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentAnalyticsService } from './recruitment-analytics.service';
import { RecruitmentCampaignService } from './recruitment-campaign.service';
import { RecruitmentUploadService } from './recruitment-upload.service';
import { RecruitmentResumeParserService } from './recruitment-resume-parser.service';
import { RecruitmentKnowledgeSyncService } from './recruitment-knowledge-sync.service';

/** Подбор менеджеров по продажам */
@Module({
  imports: [DatabaseModule],
  controllers: [RecruitmentController],
  providers: [
    RecruitmentService,
    RecruitmentAnalyticsService,
    RecruitmentCampaignService,
    RecruitmentUploadService,
    RecruitmentResumeParserService,
    RecruitmentKnowledgeSyncService,
  ],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
