import { IsString, MinLength } from 'class-validator';

export class CreateKnowledgeTargetAudienceDto {
  @IsString()
  @MinLength(1)
  label: string;
}
