import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { LEAD_STATUSES } from '../lead.types';

export class UpdateLeadDto {
  @IsOptional()
  @IsIn([...LEAD_STATUSES])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  managerNote?: string | null;
}
