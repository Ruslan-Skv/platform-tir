import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySalaryPayoutsDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  /** Способ выплаты: наличные / банк. */
  @IsOptional()
  @IsIn(['CASH', 'BANK'])
  method?: 'CASH' | 'BANK';

  /** Источник записи: выплаты раздела / ручные записи ДП с основанием «Зар/плата». */
  @IsOptional()
  @IsIn(['PAYOUT', 'DP'])
  source?: 'PAYOUT' | 'DP';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
