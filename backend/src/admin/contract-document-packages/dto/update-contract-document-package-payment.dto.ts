import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  PaymentFormDto,
  PaymentTypeDto,
} from '../../contract-payments/dto/create-contract-payment.dto';

export class UpdateContractDocumentPackagePaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ enum: PaymentFormDto })
  @IsOptional()
  @IsEnum(PaymentFormDto)
  paymentForm?: PaymentFormDto;

  @ApiPropertyOptional({ enum: PaymentTypeDto })
  @IsOptional()
  @IsEnum(PaymentTypeDto)
  paymentType?: PaymentTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  addendumNumber?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  basis?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}
