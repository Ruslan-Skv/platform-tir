import { IsObject } from 'class-validator';

export class SubmitKnowledgeQuizDto {
  @IsObject()
  answers: Record<string, string>;
}
