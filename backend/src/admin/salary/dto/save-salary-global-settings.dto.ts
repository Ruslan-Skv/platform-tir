import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalaryEmployeeSalaryDto {
  @IsString()
  userId: string;

  /** Месячный оклад; null/0 — оклад сотрудника не установлен. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlySalary: number | null;
}

export class SaveSalaryGlobalSettingsDto {
  /** Налог, удерживаемый из фондов, % */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercent?: number;

  /** Контролировать режим работы (удержания из оклада за опоздания/ранние уходы). */
  @IsOptional()
  @IsBoolean()
  workModeEnforced?: boolean;

  /** Учитывать прогулы (удержание дневной доли оклада за каждый прогул). */
  @IsOptional()
  @IsBoolean()
  truancyEnforced?: boolean;

  /** Премии за места по итогам продаж месяца (журнал ДП), ₽. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  salesBonusFirstPlace?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salesBonusSecondPlace?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salesBonusThirdPlace?: number;

  /** Минимальный уровень продаж менеджера за месяц для права на премию, ₽. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  salesBonusMinSales?: number;

  /** План продаж: пороги объёма продаж за месяц, ₽. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  salesPlanThreshold1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salesPlanThreshold2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salesPlanThreshold3?: number;

  /** Премия за достижение порога плана — % от з/п менеджера по договорам за месяц. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  salesPlanPercent1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  salesPlanPercent2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  salesPlanPercent3?: number;

  /** Пользователь-бригадир (получатель бригадирского фонда); '' / null — не назначен. */
  @IsOptional()
  @IsString()
  brigadierUserId?: string | null;

  /** Месячные оклады сотрудников (полный список — замена существующего). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryEmployeeSalaryDto)
  employeeSalaries?: SalaryEmployeeSalaryDto[];
}
