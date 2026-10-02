import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { BankCode, BankEntryType } from '@prisma/client';

export class CreateBankEntryDto {
  /** Дата зачисления по выписке (YYYY-MM-DD). */
  @IsDateString()
  entryDate: string;

  /** Банк расчётного счёта. */
  @IsEnum(BankCode)
  bank: BankCode;

  /** Способ оплаты клиента: терминал + QR, по счёту, перевод на ЛК. */
  @IsEnum(BankEntryType)
  entryType: BankEntryType;

  /** Зачислено на счёт (за вычетом комиссии), RUB. */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  amount: number;

  /** Комиссия банка в составе операции, RUB. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  fee?: number;

  /** Возврат в составе операции, RUB. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  refund?: number;

  /** Контрагент/источник поступления (ФИО, организация). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  counterparty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/** Правка записи банка (исправление ошибок ввода): передаются только исправляемые поля. */
export class UpdateBankEntryDto {
  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @IsOptional()
  @IsEnum(BankCode)
  bank?: BankCode;

  @IsOptional()
  @IsEnum(BankEntryType)
  entryType?: BankEntryType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  fee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  refund?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  counterparty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
