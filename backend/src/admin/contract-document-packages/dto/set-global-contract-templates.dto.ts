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

  /** Нельзя удалить из списка и нельзя архивировать, пока включено (снимается отдельно). */
  @IsOptional()
  @IsBoolean()
  isProtected?: boolean;

  /** Мягкое удаление: не показывается в списках выбора, остаётся в JSON. */
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
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
