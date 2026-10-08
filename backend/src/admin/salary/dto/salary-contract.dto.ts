import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SalaryExtraBillDto {
  /** id доп. счёта — cuid */
  @IsOptional()
  @IsString()
  id?: string;

  /** Сумма доп. счёта (может быть отрицательной) */
  @IsNumber()
  amount: number;

  /** Дата доп. счёта (YYYY-MM-DD) */
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Ссылки на офис/категорию/сотрудников — cuid из CRM, не UUID. */
export class CreateSalaryContractDto {
  @IsString()
  @IsNotEmpty()
  officeId: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  number: string;

  /** Дата заключения (может отсутствовать — тогда нет доли «при заключении») */
  @IsOptional()
  @IsDateString()
  signedAt?: string | null;

  /** Дата закрытия */
  @IsOptional()
  @IsDateString()
  closedAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  managerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  managerName?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  surveyorId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  surveyorName?: string | null;

  /** Вёл ли менеджер (false — его часть ×2 уходит в общий пул) */
  @IsOptional()
  @IsBoolean()
  managerHandled?: boolean;

  /** Был ли замер (false — часть замерщика ×2 уходит в общий пул) */
  @IsOptional()
  @IsBoolean()
  surveyorHandled?: boolean;

  /** База: ст-ть изделий + монтаж либо стоимость договора */
  @IsNumber()
  @Min(0)
  baseAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  managerPercentOverride?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  surveyorPercentOverride?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vsPercentOverride?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  brigadierPercentOverride?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  /** Доп. счета (при передаче — полностью заменяют существующие) */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SalaryExtraBillDto)
  extraBills?: SalaryExtraBillDto[];
}

export class UpdateSalaryContractDto extends PartialType(CreateSalaryContractDto) {}

export class QuerySalaryContractsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  officeId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  /** Фильтр по дате заключения */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
