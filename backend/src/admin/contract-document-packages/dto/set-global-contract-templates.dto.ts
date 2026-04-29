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

  @IsString()
  html: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
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
