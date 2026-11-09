import { ContractDocumentPackageKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class SetWorkOrderMarkupByKindDto {
  @IsEnum(ContractDocumentPackageKind)
  kind: ContractDocumentPackageKind;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  windowsWorkOrderMarkupPercent: number;

  /** Стоимость одного угла в заказ-наряде потолков, ₽ (только CEILINGS); null — сбросить. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ceilingsWorkOrderCornerPrice?: number | null;
}
