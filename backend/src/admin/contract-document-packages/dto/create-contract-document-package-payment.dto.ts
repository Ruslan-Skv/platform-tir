import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidateIf,
} from 'class-validator';

import {
  PaymentFormDto,
  PaymentTypeDto,
} from '../../contract-payments/dto/create-contract-payment.dto';

export class CreateContractDocumentPackagePaymentDto {
  @ApiProperty()
  @IsDateString()
  paymentDate: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentFormDto })
  @IsEnum(PaymentFormDto)
  paymentForm: PaymentFormDto;

  @ApiProperty({ enum: PaymentTypeDto })
  @IsEnum(PaymentTypeDto)
  paymentType: PaymentTypeDto;

  @ApiPropertyOptional({ description: 'Обязательно для paymentType AMENDMENT: номер Д/с 1…5' })
  @ValidateIf((o) => o.paymentType === PaymentTypeDto.AMENDMENT)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  addendumNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  basis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
