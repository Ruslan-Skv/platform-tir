import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Создание/редактирование поставщика: реквизитная карточка раздела «Поставщики».
 *  Банковские реквизиты (банк, р/с, БИК) ведутся отдельными блоками — см. save-requisite.dto.ts. */
export class SaveSupplierDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  legalName: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  commercialName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  inn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  legalAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phone?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Сальдо начальное: + — должны поставщику, − — переплата. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  openingBalance?: number;

  /** Дата, на которую зафиксировано сальдо начальное (ГГГГ-ММ-ДД). */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  openingBalanceDate?: string;
}
