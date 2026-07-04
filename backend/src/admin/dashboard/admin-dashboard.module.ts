import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardSettingsService } from './admin-dashboard-settings.service';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [DatabaseModule, KnowledgeModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService, AdminDashboardSettingsService],
})
export class AdminDashboardModule {}
