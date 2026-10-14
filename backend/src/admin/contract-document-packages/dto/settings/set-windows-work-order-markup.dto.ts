import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class SetWindowsWorkOrderMarkupDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  windowsWorkOrderMarkupPercent: number;
}
