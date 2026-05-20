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
        itemId?: string;
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

  @IsOptional()
  @IsString()
  createdAt?: string;

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

  /** Порядок в ленте для расчёта вне объекта. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  mergeListOrder?: number;

  /** Порядок внутри объекта. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  inGroupListOrder?: number;

  /** Связка экземпляров при разделении одной сметы на несколько договоров. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  splitBundleId?: string;

  /** Включённые в экземпляр позиции сметы (стабильные id строк). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8000)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  estimateWorkScopeKeys?: string[];

  /** ISO — расчёт в корзине (скрыт из основного списка). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  deletedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deletedById?: string;
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

  /** Порядок блока объекта в общей ленте. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  mergeListOrder?: number;
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
