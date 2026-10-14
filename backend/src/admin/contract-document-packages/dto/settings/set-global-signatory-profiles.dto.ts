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

export class SignatoryProfileDto {
  @IsString()
  @MaxLength(160)
  title: string;

  /** Связь с пользователем CRM (та же сущность, что в разделе «Менеджеры»). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  crmUserId?: string;

  @IsOptional()
  @IsString()
  directorNameNominative?: string;

  @IsOptional()
  @IsString()
  directorNameGenitive?: string;

  @IsOptional()
  @IsString()
  basis?: string;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsOptional()
  @IsString()
  salesOffice?: string;

  @IsOptional()
  @IsString()
  officePhone?: string;
}

export class SetGlobalSignatoryProfilesDto {
  @IsEnum(ContractDocumentPackageKind)
  kind: ContractDocumentPackageKind;

  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => SignatoryProfileDto)
  items: SignatoryProfileDto[];
}
