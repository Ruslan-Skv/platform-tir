import { IsString, IsOptional, IsBoolean, IsNumber, IsEmail, IsArray } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsOptional()
  name?: string; // Для обратной совместимости

  @IsString()
  legalName: string; // Наименование юридическое (обязательное)

  @IsString()
  @IsOptional()
  commercialName?: string; // Наименование коммерческое

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  phone?: string[]; // Массив телефонов

  @IsString()
  @IsOptional()
  website?: string; // Адрес сайта

  @IsString()
  @IsOptional()
  legalAddress?: string; // Юридический адрес

  @IsString()
  @IsOptional()
  inn?: string; // ИНН

  @IsString()
  @IsOptional()
  bankName?: string; // Банк

  @IsString()
  @IsOptional()
  bankAccount?: string; // Расчетный счет (р/сч)

  @IsString()
  @IsOptional()
  bankBik?: string; // БИК

  @IsString()
  @IsOptional()
  apiUrl?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsNumber()
  @IsOptional()
  priceMarkup?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  syncEnabled?: boolean;

  @IsString()
  @IsOptional()
  syncSchedule?: string; // cron expression
}
