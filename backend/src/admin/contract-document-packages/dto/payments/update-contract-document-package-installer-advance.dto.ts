import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { InstallerAdvancePaymentMethodDto } from './payment.enums';

export class UpdateContractDocumentPackageInstallerAdvanceDto {
  @ApiPropertyOptional({ description: 'Мастер из справочника (CRM → Мастера)' })
  @IsOptional()
  @IsString()
  installerId?: string;

  @ApiPropertyOptional({ description: 'Дата выдачи аванса' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ description: 'Сумма аванса, руб.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({
    enum: InstallerAdvancePaymentMethodDto,
    description: 'Способ оплаты: CASH — наличные, BANK — банк; null — сбросить',
  })
  @IsOptional()
  @IsEnum(InstallerAdvancePaymentMethodDto)
  paymentMethod?: InstallerAdvancePaymentMethodDto | null;

  @ApiPropertyOptional({ description: 'Комментарий (за что выдан аванс); null — сбросить' })
  @IsOptional()
  @IsString()
  note?: string | null;
}
