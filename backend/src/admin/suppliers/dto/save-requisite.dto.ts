import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Создание/редактирование банковских реквизитов поставщика.
 *  У одного поставщика может быть несколько блоков реквизитов (разные юрлица/счёта). */
export class SaveSupplierRequisiteDto {
  /** Наименование блока: «ИП Ермаков», «ООО Ника», «Реквизиты до 2021» и т.п. */
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  bankBik?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  corrAccount?: string;

  /** ИНН блока — если у юрлица поставщика он отличается от ИНН карточки. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  inn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  kpp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /** Реквизиты по умолчанию (показываются первыми, подставляются в новые записи). */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
