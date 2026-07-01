import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateKnowledgePlatformSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  quizTimePerQuestionSeconds: number;
}
