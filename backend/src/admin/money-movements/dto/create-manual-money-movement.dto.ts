import { PaymentForm } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  NotEquals,
} from 'class-validator';

export class CreateManualMoneyMovementDto {
  /** Менеджер, по кассе которого проводится запись; по умолчанию — текущий пользователь. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  managerId?: string;

  /** Сумма со знаком: внесение > 0, изъятие < 0. */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @NotEquals(0, { message: 'Сумма не может быть нулевой' })
  amount: number;

  @IsEnum(PaymentForm)
  paymentForm: PaymentForm;

  /**
   * Дата записи (YYYY-MM-DD). Клиентом не передаётся: новая запись фиксируется
   * текущей датой сервера (поле оставлено для совместимости; при правке без
   * поля дата записи не меняется).
   */
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  /**
   * Направление записи: одно из направлений договоров, «Материалы» или «Прочее».
   * «Прочее» — движения вне продаж, не учитывается в итоговых продажах.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  direction?: string;

  /** № договора — только для направлений и «Материалов» (колонка «№ договора» журнала). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contractNumber?: string;

  /** Заказчик — только для направлений и «Материалов» (колонка «Заказчик» журнала). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  /** Исполнитель — только для направления «Мебель»: название набора из справочника реквизитов. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  executorName?: string;

  /** Основание: «Бытовые нужды», «Возврат излишка» и т.п. */
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  basis: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
