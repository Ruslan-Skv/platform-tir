import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString, Matches, MaxLength } from 'class-validator';

/** Фиксация начального остатка кассы (центра): задаёт или перезаписывает запись
 *  kind = OPENING — якорь, от которого считаются остатки на любую дату. */
export class SetOpeningBalanceDto {
  /** Дата, на которую зафиксирован остаток (YYYY-MM-DD). */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Дата остатка должна быть в формате ГГГГ-ММ-ДД' })
  date: string;

  /** Фактическая сумма наличных в кассе на дату (положительное число). */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Начальный остаток должен быть положительным числом' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
