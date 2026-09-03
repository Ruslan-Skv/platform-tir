import { ContractDocumentPackageKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class PreviewContractNumberDto {
  @IsString()
  @MaxLength(40)
  managerUserId: string;

  @IsString()
  @MaxLength(40)
  surveyorUserId: string;

  @IsString()
  @MaxLength(40)
  officeId: string;

  @IsEnum(ContractDocumentPackageKind)
  kind: ContractDocumentPackageKind;

  /** Буква в номере вместо CRM numberLetter (мебель: м / с / т). */
  @IsOptional()
  @IsString()
  @MaxLength(4)
  numberLetterOverride?: string;
}
