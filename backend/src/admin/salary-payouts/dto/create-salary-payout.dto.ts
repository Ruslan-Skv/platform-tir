import { SalaryPayoutCategory, SalaryPayoutMethod } from '@prisma/client';
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
  MinLength,
} from 'class-validator';

export class CreateSalaryPayoutDto {
  /** Дата выплаты (YYYY-MM-DD). */
  @IsDateString()
  paidAt: string;

  /** Сумма выплаты — положительное число. */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Сумма выплаты должна быть больше нуля' })
  @Max(99_999_999_999)
  amount: number;

  /** Способ выплаты: наличными из кассы или переводом по банку. */
  @IsEnum(SalaryPayoutMethod)
  paymentMethod: SalaryPayoutMethod;

  /** Категория выплаты: зар/плата, аванс, премия, прочее. */
  @IsOptional()
  @IsEnum(SalaryPayoutCategory)
  category?: SalaryPayoutCategory;

  /** Сотрудник-получатель из справочника (id пользователя). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  recipientUserId?: string;

  /**
   * ФИО получателя вручную — для сторонних лиц, которых нет в справочнике.
   * Если указан recipientUserId, поле игнорируется (имя снимается со справочника).
   */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  recipientName?: string;

  /** Менеджер, по кассе которого проведена наличная выплата; по умолчанию — текущий пользователь. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  managerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
