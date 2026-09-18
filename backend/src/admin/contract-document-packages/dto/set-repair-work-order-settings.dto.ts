import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class SetRepairWorkOrderSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  markupPercent: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  taxPercent: number;
}
