import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AdminLeadsController } from './admin-leads.controller';
import { AdminDirectorMessagesController } from './admin-director-messages.controller';
import { AdminLeadsService } from './admin-leads.service';
import { AdminLeadsFeedbackService } from './services/admin-leads-feedback.service';
import { AdminLeadsFormService } from './services/admin-leads-form.service';
import { AdminLeadsOrderService } from './services/admin-leads-order.service';
import { AdminLeadsQuizService } from './services/admin-leads-quiz.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminLeadsController, AdminDirectorMessagesController],
  providers: [
    AdminLeadsService,
    AdminLeadsFormService,
    AdminLeadsQuizService,
    AdminLeadsOrderService,
    AdminLeadsFeedbackService,
  ],
  exports: [AdminLeadsService],
})
export class AdminLeadsModule {}
