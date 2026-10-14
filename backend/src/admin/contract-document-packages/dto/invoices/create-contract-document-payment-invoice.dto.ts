import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { PaymentInvoiceLineItemDto } from './payment-invoice-line-item.dto';

export enum CreateContractDocumentPaymentInvoiceTypeDto {
  PREPAYMENT = 'PREPAYMENT',
  ADVANCE = 'ADVANCE',
  FINAL = 'FINAL',
  AMENDMENT = 'AMENDMENT',
}

export class CreateContractDocumentPaymentInvoiceDto {
  @IsISO8601({ strict: true })
  invoiceDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(CreateContractDocumentPaymentInvoiceTypeDto)
  paymentType!: CreateContractDocumentPaymentInvoiceTypeDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  addendumNumber?: number;

  @IsString()
  @MinLength(1)
  basis!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PaymentInvoiceLineItemDto)
  lineItems?: PaymentInvoiceLineItemDto[];
}
