import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, ArrayMaxSize, IsString } from 'class-validator';

/** Лимит за один запрос (избранное может быть длиннее списка сравнения). */
export const MAX_PRODUCTS_IN_WISHLIST_BATCH = 500;

export class WishlistProductIdsDto {
  @ApiProperty({
    example: ['clxxx1', 'clxxx2'],
    description: 'ID активных товаров в порядке отображения',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PRODUCTS_IN_WISHLIST_BATCH)
  @IsString({ each: true })
  productIds: string[];
}
