import { ContractDocumentPackageKind } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContractTemplatePresetDto {
  @IsString()
  @MaxLength(80)
  id: string;

  @IsString()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tabId?: string;

  @IsString()
  html: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  /** Мягкое скрытие: не показывается в списках выбора, остаётся в JSON. */
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  /** Корзина: ISO-дата удаления; через 30 дней запись удаляется безвозвратно. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  deletedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deletedById?: string;
}

export class SetGlobalContractTemplatesDto {
  @IsEnum(ContractDocumentPackageKind)
  kind: ContractDocumentPackageKind;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ContractTemplatePresetDto)
  items: ContractTemplatePresetDto[];
}
