import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Один вариант «схожего товара» в карточке (до 5 на товар). */
export class ProductCardVariantDto {
  @ApiProperty({ example: 'Дверь белая 60×200' })
  @IsString()
  name: string;

  @ApiProperty({ example: 15000.0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ example: '60×200', required: false })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ example: 'Белый', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 'С подсветкой', required: false })
  @IsOptional()
  @IsString()
  extraOption?: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;
}
