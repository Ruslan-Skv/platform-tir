import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export type SalaryRoleValue = 'MANAGER' | 'SURVEYOR' | 'LEAD_SPECIALIST' | 'BRIGADIER';

export const SALARY_ROLE_VALUES: readonly SalaryRoleValue[] = [
  'MANAGER',
  'SURVEYOR',
  'LEAD_SPECIALIST',
  'BRIGADIER',
] as const;

export class CreateSalaryCategoryDto {
  @IsString()
  @Length(2, 50)
  code: string;

  @IsString()
  @Length(2, 100)
  name: string;

  /** Процент ведущего специалиста (ВС), % */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vsPercent?: number;

  /** Доля з/п менеджера при заключении (0.7 / 0.5 / 0.8) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  splitSign?: number;

  /** Доля з/п менеджера при закрытии (0.3 / 0.5 / 0.2) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  splitClose?: number;

  /** Процент менеджера по умолчанию, % */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  managerPercent?: number;

  /** Процент замерщика по умолчанию, % */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  surveyorPercent?: number;

  /** Процент бригадира по умолчанию, % */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  brigadierPercent?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSalaryCategoryDto extends PartialType(CreateSalaryCategoryDto) {}

export class UpsertSalaryRateRuleDto {
  /** Правило для конкретного офиса (пусто — все офисы) */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  officeId?: string | null;

  /** Должность */
  @IsString()
  @IsIn(SALARY_ROLE_VALUES)
  role: SalaryRoleValue;

  /** Процент от базы, % */
  @IsNumber()
  @Min(0)
  @Max(100)
  percent: number;
}
