import { ContractDocumentPackageStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateContractDocumentPackageDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  title?: string | null;

  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  crmContractId?: string | null;

  @IsOptional()
  @IsEnum(ContractDocumentPackageStatus)
  status?: ContractDocumentPackageStatus;

  /** Если true — после сохранения добавляется запись в журнал событий пакета (снимок метаданных). */
  @IsOptional()
  @IsBoolean()
  recordVersion?: boolean;
}
