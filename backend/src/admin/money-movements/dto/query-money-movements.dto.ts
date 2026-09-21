import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryMoneyMovementsDto {
  @IsOptional()
  @IsString()
  managerId?: string;

  /** «Мои» — только записи, где менеджером зафиксирован текущий пользователь. */
  @IsOptional()
  @IsIn(['mine', 'all'])
  scope?: string;

  @IsOptional()
  @IsString()
  direction?: string;

  @IsOptional()
  @IsString()
  paymentForm?: string;

  @IsOptional()
  @IsString()
  paymentType?: string;

  /** Тип записи: «manual» — ручные проводки, «auto» — автоматические по оплатам договоров. */
  @IsOptional()
  @IsIn(['manual', 'auto'])
  entryKind?: 'manual' | 'auto';

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
