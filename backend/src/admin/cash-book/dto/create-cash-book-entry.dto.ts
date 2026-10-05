import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, MinLength, NotEquals } from 'class-validator';

/** Создание записи в кассе: ручная наличная проводка, сразу сверённая. */
export class CreateCashBookEntryDto {
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

  /**
   * Направление записи: одно из направлений договоров, «Материалы» или «Прочее».
   * «Прочее» — движения вне продаж, не учитывается в итоговых продажах.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  direction?: string;

  /** № договора — только для направлений и «Материалов». */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contractNumber?: string;

  /** Заказчик — только для направлений и «Материалов». */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  /** Исполнитель — только для направления «Мебель». */
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
