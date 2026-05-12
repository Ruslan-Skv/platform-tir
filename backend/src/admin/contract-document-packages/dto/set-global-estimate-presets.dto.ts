import { ContractDocumentPackageKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ContractEstimatePresetDto {
  @IsOptional()
  @IsObject()
  snapshot?: {
    total: number;
    rooms: Array<{
      name: string;
      total: number;
      lines: Array<{
        name: string;
        unit: string;
        quantity: number;
        price: number;
        amount: number;
      }>;
    }>;
  } | null;

  @IsString()
  @MaxLength(80)
  id: string;

  @IsString()
  @MaxLength(160)
  title: string;

  @IsString()
  @MaxLength(120)
  categorySlug: string;

  @IsString()
  @MaxLength(200)
  categoryName: string;

  @IsString()
  calculatorDraft: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;

  /** Объект (группа расчётов), опционально. */
  @IsOptional()
  @IsString()
  @MaxLength(48)
  groupId?: string;

  /** Замер-источник (если расчёт создан из замера). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sourceMeasurementId?: string;

  /** Доп. наценка на расчёт, % (если не задано — для расчёта в объекте берётся наценка объекта). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999)
  additionalMarkupPercent?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  archived?: boolean;
}

/** Логический объект: несколько расчётов одного здания / проекта. */
export class ContractEstimateGroupDto {
  @IsString()
  @MaxLength(48)
  id: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;

  /** Доп. наценка на все расчёты объекта, % (0 — без наценки на уровне объекта). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999)
  additionalMarkupPercent?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  archived?: boolean;
}

export class SetGlobalEstimatePresetsDto {
  @IsEnum(ContractDocumentPackageKind)
  kind: ContractDocumentPackageKind;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ContractEstimatePresetDto)
  items: ContractEstimatePresetDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => ContractEstimateGroupDto)
  groups?: ContractEstimateGroupDto[];
}
