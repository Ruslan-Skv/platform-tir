import { ContractDocumentPackageKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min } from 'class-validator';

export class SetWorkPeriodSettingsByKindDto {
  @IsEnum(ContractDocumentPackageKind)
  kind: ContractDocumentPackageKind;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  defaultWorkPeriodDays: number;
}

export class ApplyWorkPeriodToAllByKindDto {
  @IsEnum(ContractDocumentPackageKind)
  kind: ContractDocumentPackageKind;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  workPeriodDays: number;
}
