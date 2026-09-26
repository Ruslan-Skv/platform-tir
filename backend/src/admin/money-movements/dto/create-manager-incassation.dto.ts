import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateManagerIncassationDto {
  /** Менеджер, сдающий инкассацию; по умолчанию — текущий пользователь. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  managerId?: string;

  /** За кого сдаётся инкассация: менеджер, по чьей кассе закрывается остаток. Пусто — за себя. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  onBehalfOfId?: string;

  /** Сумма сданных наличных, RUB (> 0). */
  @Type(() => Number)
  @IsPositive()
  @Max(100_000_000)
  amount: number;

  /** ФИО лица, производившего инкассацию (фиксирует менеджер). */
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  incassator: string;

  /**
   * Дата и время инкассации. Игнорируется: запись всегда фиксируется текущим
   * моментом на сервере (поле оставлено для совместимости старых клиентов).
   */
  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class QueryManagerIncassationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
