import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, ArrayMaxSize, IsString } from 'class-validator';

/** Лимит как у серверного списка сравнения. */
export const MAX_PRODUCTS_IN_COMPARE = 10;

export class CompareProductIdsDto {
  @ApiProperty({
    example: ['clxxx1', 'clxxx2'],
    description: 'ID активных товаров в порядке отображения (макс. 10)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PRODUCTS_IN_COMPARE)
  @IsString({ each: true })
  productIds: string[];
}
