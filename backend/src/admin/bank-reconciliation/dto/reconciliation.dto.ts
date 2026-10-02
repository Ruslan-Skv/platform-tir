import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class QueryReconciliationDto {
  /** Начало периода сверки (YYYY-MM-DD) — по дате зачисления банка. */
  @IsDateString()
  dateFrom: string;

  /** Конец периода сверки (YYYY-MM-DD). */
  @IsDateString()
  dateTo: string;

  /** Лаг зачисления в днях: оплата ДП может прийти на счёт в течение этих дней. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(14)
  lagDays?: number;
}

export class ReconciliationLinkItemDto {
  @IsString()
  moneyMovementId: string;

  /** Сколько суммы оплаты покрывает связь; по умолчанию — максимум доступного. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100_000_000)
  amount?: number;
}

/** Зафиксировать связи «поступление банка ↔ оплаты ДП». */
export class CreateReconciliationLinksDto {
  /** cuid поступления банка. */
  @IsString()
  @MaxLength(40)
  bankEntryId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReconciliationLinkItemDto)
  items: ReconciliationLinkItemDto[];
}

/** История зафиксированных связей за период. */
export class QueryReconciliationLinksDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class UnlinkNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
