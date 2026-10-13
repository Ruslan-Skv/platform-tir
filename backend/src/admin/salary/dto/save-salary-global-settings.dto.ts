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

export class SalaryManagerSalesPlanDto {
  @IsString()
  userId: string;

  /** Пороги объёма продаж за месяц, ₽; null/0 — порог не задан. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold1?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold2?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold3?: number | null;

  /** Премия за достижение порога, % от з/п менеджера по договорам. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percent1?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percent2?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percent3?: number | null;
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

  /** Удержание из оклада за каждое опоздание/ранний уход, ₽. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  workModePenaltyRub?: number;

  /** Учитывать автозакрытия (удержания из оклада за автозакрытые рабочие дни). */
  @IsOptional()
  @IsBoolean()
  autoCloseEnforced?: boolean;

  /** Удержание из оклада за каждое автозакрытие рабочего дня, ₽. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  autoClosePenaltyRub?: number;

  /** Начислять премию «QR + Н» (терминал < 50% продаж месяца). */
  @IsOptional()
  @IsBoolean()
  cashQrBonusEnforced?: boolean;

  /** Премия «QR + Н»: процент от не терминальных продаж месяца, %. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cashQrBonusPercent?: number;

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

  /** Индивидуальные планы продаж менеджеров (полный список — замена существующего). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryManagerSalesPlanDto)
  managerSalesPlans?: SalaryManagerSalesPlanDto[];
}
