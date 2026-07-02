import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateKnowledgePlatformSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  materialQuizTimePerQuestionSeconds: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  categoryQuizTimePerQuestionSeconds: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  materialQuizMaxAttemptsPerDay: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  categoryQuizMaxAttemptsPerDay: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  materialQuizRetryCooldownMinutes: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  categoryQuizRetryCooldownMinutes: number;
}
