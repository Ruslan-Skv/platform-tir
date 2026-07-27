import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { ContractDocumentPackageKind } from '@prisma/client';

export class CreateContractDocumentPackageDto {
  @IsEnum(ContractDocumentPackageKind)
  kind: ContractDocumentPackageKind;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  crmContractId?: string;

  @IsOptional()
  @IsString()
  responsibleManagerId?: string;
}
