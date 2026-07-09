import { IsString, IsOptional, IsBoolean, IsNumber, Min, IsNotEmpty } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateComponentCatalogItemDto {
  @IsString()
  @IsNotEmpty()
  kindId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  material?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') return parseFloat(value.replace(',', '.'));
    return value;
  })
  price: number;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  stock?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}
