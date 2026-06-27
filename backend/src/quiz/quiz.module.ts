import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { BellPushModule } from '../bell-push/bell-push.module';
import { DatabaseModule } from '../database/database.module';
import { OriginGuard } from '../common/guards/origin.guard';
import { QuizNotifierService } from './quiz-notifier.service';
import { QuizPublicController } from './quiz-public.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [ConfigModule, DatabaseModule, MailerModule, BellPushModule],
  controllers: [QuizPublicController],
  providers: [QuizService, QuizNotifierService, OriginGuard],
  exports: [QuizService],
})
export class QuizModule {}
