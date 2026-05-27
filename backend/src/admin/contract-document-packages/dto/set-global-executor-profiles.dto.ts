import { ContractDocumentPackageKind } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
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
  @IsIn(['COMPANY', 'ENTREPRENEUR'])
  kind?: 'COMPANY' | 'ENTREPRENEUR';

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
  ogrnip?: string;

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
  @MaxLength(240)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  bankBik?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankCorrAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankSettlementAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;
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
