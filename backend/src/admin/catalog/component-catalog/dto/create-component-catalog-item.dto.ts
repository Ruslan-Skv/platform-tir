import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ComponentKind } from '@prisma/client';

export class CreateComponentCatalogItemDto {
  @IsEnum(ComponentKind)
  kind: ComponentKind;

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

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  kitQuantity?: number | null;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  quantityStep?: number;
}
