import { IsString, IsOptional, IsNumber, IsBoolean, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateComponentCatalogKindDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  kitQuantity?: number | null;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  @Type(() => Number)
  quantityStep?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
