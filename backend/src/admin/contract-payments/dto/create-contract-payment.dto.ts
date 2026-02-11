import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PaymentFormDto {
  CASH = 'CASH',
  TERMINAL = 'TERMINAL',
  QR = 'QR',
  INVOICE = 'INVOICE',
  LC_TRANSFER = 'LC_TRANSFER',
}

export enum PaymentTypeDto {
  PREPAYMENT = 'PREPAYMENT',
  ADVANCE = 'ADVANCE',
  FINAL = 'FINAL',
  AMENDMENT = 'AMENDMENT',
}

export class CreateContractPaymentDto {
  @ApiProperty()
  @IsString()
  contractId: string;

  @ApiProperty()
  @IsDateString()
  paymentDate: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: PaymentFormDto })
  @IsEnum(PaymentFormDto)
  paymentForm: PaymentFormDto;

  @ApiProperty({ enum: PaymentTypeDto })
  @IsEnum(PaymentTypeDto)
  paymentType: PaymentTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
