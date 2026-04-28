import { ContractDocumentPackageKind } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExecutorProfileDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  inn?: string;

  @IsOptional()
  @IsString()
  kpp?: string;

  @IsOptional()
  @IsString()
  ogrn?: string;

  @IsOptional()
  @IsString()
  legalAddress?: string;

  @IsOptional()
  @IsString()
  actualAddress?: string;

  @IsOptional()
  @IsString()
  bankDetails?: string;

  @IsOptional()
  @IsString()
  directorNameNominative?: string;

  @IsOptional()
  @IsString()
  directorNameGenitive?: string;

  @IsOptional()
  @IsString()
  basis?: string;
}

export class SetGlobalExecutorProfilesDto {
  @IsEnum(ContractDocumentPackageKind)
  kind: ContractDocumentPackageKind;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ExecutorProfileDto)
  items: ExecutorProfileDto[];
}
