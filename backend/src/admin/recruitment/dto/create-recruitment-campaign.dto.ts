import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRecruitmentCampaignDto {
  @IsString()
  @MinLength(2)
  title: string;
}

export class CloseRecruitmentCampaignDto {
  @IsOptional()
  @IsString()
  selectedCandidateId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
