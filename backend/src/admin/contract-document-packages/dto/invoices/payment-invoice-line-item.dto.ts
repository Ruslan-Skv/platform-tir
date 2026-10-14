import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class PaymentInvoiceLineItemDto {
  @IsOptional()
  @IsIn(['GOODS', 'SERVICE'])
  lineKind?: 'GOODS' | 'SERVICE';

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  quantity?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  vatLabel?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}
