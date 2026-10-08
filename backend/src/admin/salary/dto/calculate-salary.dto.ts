import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CalculateSalaryDto {
  /** Начало периода (YYYY-MM-DD, включительно) */
  @IsDateString()
  dateFrom: string;

  /** Конец периода (YYYY-MM-DD, включительно) */
  @IsDateString()
  dateTo: string;

  /** Ограничить расчёт одним офисом (id офиса — cuid из CRM) */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  officeId?: string;
}

export class CreateSalarySettlementDto extends CalculateSalaryDto {}
