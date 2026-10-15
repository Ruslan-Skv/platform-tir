import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { InstallerAdvancePaymentMethodDto } from './payment.enums';

export class CreateContractDocumentPackageInstallerAdvanceDto {
  @ApiProperty({ description: 'Мастер из справочника (CRM → Мастера)' })
  @IsString()
  installerId: string;

  @ApiProperty({ description: 'Дата выдачи аванса' })
  @IsDateString()
  paidAt: string;

  @ApiProperty({ description: 'Сумма аванса, руб.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    enum: InstallerAdvancePaymentMethodDto,
    description: 'Способ оплаты: CASH — наличные, BANK — банк',
  })
  @IsOptional()
  @IsEnum(InstallerAdvancePaymentMethodDto)
  paymentMethod?: InstallerAdvancePaymentMethodDto;

  @ApiPropertyOptional({ description: 'Комментарий (за что выдан аванс)' })
  @IsOptional()
  @IsString()
  note?: string;
}
