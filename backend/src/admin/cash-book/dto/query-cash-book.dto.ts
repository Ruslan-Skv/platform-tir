import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Параметры списка кассы: период по дате оплаты, менеджер, поиск, пагинация. */
export class QueryCashBookDto {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  /** Фильтр по менеджеру кассы. */
  @IsOptional()
  @IsString()
  managerId?: string;

  /** Поиск по № договора, заказчику, основанию и примечанию. */
  @IsOptional()
  @IsString()
  search?: string;

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
}
