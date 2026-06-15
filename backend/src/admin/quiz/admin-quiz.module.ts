import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AdminQuizController } from './admin-quiz.controller';
import { AdminQuizService } from './admin-quiz.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminQuizController],
  providers: [AdminQuizService],
  exports: [AdminQuizService],
})
export class AdminQuizModule {}
