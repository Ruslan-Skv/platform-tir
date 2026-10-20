import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Пункт разбивки счёта по заказу: заказ (пакет договора) + отнесённая на него сумма. */
export class SupplierLedgerOrderLinkDto {
  @IsString()
  @MaxLength(40)
  packageId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;
}

/** Создание/редактирование строки ведомости расчётов с поставщиком:
 *  счёт (начисление) и/или оплата — как в таблице на Google-Диске. */
export class SaveSupplierLedgerEntryDto {
  /** Дата счёта/оплаты (ГГГГ-ММ-ДД). */
  @IsString()
  @MaxLength(10)
  date: string;

  /** № документа свободной строкой: «№ 71 от 14 октября 2026 г.». */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  documentNo?: string;

  /** Сумма счёта (начисление задолженности). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount?: number;

  /** Оплата по счёту (уменьшает задолженность) — проводить может только супер-админ. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  payment?: number;

  /** Примечание: № договора, «бн с ип сбер» и т.п. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** НДС: null/отсутствует — не указано, 0 — без НДС, 5/10/20/22 — ставка. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  vatRate?: number | null;

  /** Блок реквизитов, по которому прошла операция (если у поставщика их несколько). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  requisiteId?: string | null;

  /** Разбивка счёта по заказам (договорам). undefined — не менять, [] — снять разбивку. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierLedgerOrderLinkDto)
  orderLinks?: SupplierLedgerOrderLinkDto[];
}
