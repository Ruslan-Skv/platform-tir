import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { QUIZ_SUBMISSION_STATUSES } from '../../../quiz/quiz.types';

export class UpdateQuizSubmissionDto {
  @ApiPropertyOptional({ enum: QUIZ_SUBMISSION_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn([...QUIZ_SUBMISSION_STATUSES])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  managerNote?: string | null;
}
