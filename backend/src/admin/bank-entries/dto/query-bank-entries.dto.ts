import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { BankCode, BankEntryType } from '@prisma/client';

export class QueryBankEntriesDto {
  /** Начало периода (YYYY-MM-DD) — дата зачисления. */
  @IsOptional()
  @IsString()
  dateFrom?: string;

  /** Конец периода (YYYY-MM-DD) — дата зачисления. */
  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsIn(Object.values(BankCode))
  bank?: string;

  @IsOptional()
  @IsIn(Object.values(BankEntryType))
  entryType?: string;

  /** Поиск по контрагенту и примечанию. */
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
