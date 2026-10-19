import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Параметры сводного списка поставщиков с сальдо расчётов. */
export class QuerySuppliersSummaryDto {
  /** Поиск по наименованию (юридическому/коммерческому) и ИНН. */
  @IsOptional()
  @IsString()
  search?: string;

  /** Фильтр по статусу расчётов. */
  @IsOptional()
  @IsIn(['ALL', 'PAYABLE', 'SETTLED', 'OVERPAY'])
  status?: string;

  /** Сортировка: по названию, сальдо к оплате или дате последней записи. */
  @IsOptional()
  @IsIn(['name', 'balance', 'lastEntry'])
  sort?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: string;

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
