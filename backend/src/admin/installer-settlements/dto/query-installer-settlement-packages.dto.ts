import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryInstallerSettlementPackagesDto {
  /** Поиск по № договора / заказчику (для выбора договора в форме выдачи аванса). */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
