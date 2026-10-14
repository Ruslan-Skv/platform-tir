import { IsEnum, IsString, MinLength } from 'class-validator';
import { ContractDocumentPackageKind } from '@prisma/client';

export class SetGlobalContractTemplateDto {
  @IsEnum(ContractDocumentPackageKind)
  kind: ContractDocumentPackageKind;

  @IsString()
  @MinLength(1)
  tab: string;

  @IsString()
  html: string;
}
