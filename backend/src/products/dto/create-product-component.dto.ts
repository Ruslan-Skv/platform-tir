import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateProductComponentDto {
  @ApiProperty({ example: 'catalog-item-id', required: false })
  @IsString()
  @IsOptional()
  catalogItemId?: string;

  @ApiProperty({ example: 'Коробка', description: 'Наименование комплектующего' })
  @ValidateIf((o) => !o.catalogItemId)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ example: 'Коробка 2000x800', description: 'Размер / тип комплектующей' })
  @ValidateIf((o) => !o.catalogItemId)
  @IsString()
  @IsNotEmpty()
  type?: string;

  @ApiProperty({ example: 1500.0, description: 'Стоимость за 1 шт.' })
  @ValidateIf((o) => !o.catalogItemId)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value.replace(',', '.'));
    }
    return value;
  })
  price?: number;

  @ApiProperty({
    example: 'data:image/png;base64,...',
    description: 'Иконка/изображение комплектующего (base64 или URL)',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ example: 10, description: 'Количество на складе', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @ApiProperty({ example: true, description: 'Активен ли компонент', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 0, description: 'Порядок сортировки', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;
}
