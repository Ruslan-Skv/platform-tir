import { IsArray, IsOptional, IsString, ArrayUnique } from 'class-validator';

export class CreateContractDocumentObjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  packageIds?: string[];
}
