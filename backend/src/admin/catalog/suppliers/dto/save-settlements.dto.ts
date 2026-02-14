import { IsArray, IsOptional, IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SupplierSettlementRowDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  invoice?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  payment?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class SaveSettlementsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierSettlementRowDto)
  rows: SupplierSettlementRowDto[];
}
