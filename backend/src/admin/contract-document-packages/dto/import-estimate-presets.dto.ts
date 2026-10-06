import { ContractDocumentPackageKind } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Тело импорта файла экспорта расчёта (суперадмин). Пресеты/группы/каталог проходят
 * как вложенные объекты без глубокой валидации — форму проверяет сервис переноса.
 */
export class ImportEstimatePresetsPayloadDto {
  @IsString()
  format: string;

  @IsNumber()
  version: number;

  @IsOptional()
  @IsString()
  exportedAt?: string;

  @IsEnum(ContractDocumentPackageKind)
  kind: ContractDocumentPackageKind;

  @IsArray()
  @ArrayMaxSize(200)
  @IsObject({ each: true })
  presets: object[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @IsObject({ each: true })
  groups?: object[];

  @IsOptional()
  @IsObject()
  catalog?: {
    categories?: object[];
    items?: object[];
  };
}
