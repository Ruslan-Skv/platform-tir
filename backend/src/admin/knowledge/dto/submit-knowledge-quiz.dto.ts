import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class SubmitKnowledgeQuizDto {
  @IsObject()
  answers: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  timedOut?: boolean;
}
