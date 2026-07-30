import { ContractDocumentPackageKind } from '@prisma/client';
import { IsEnum, IsString, MaxLength } from 'class-validator';

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
}
