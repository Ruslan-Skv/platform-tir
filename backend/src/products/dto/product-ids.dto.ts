import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, ArrayMaxSize, IsString } from 'class-validator';

const MAX_BULK_IDS = 1000;

export class ProductIdsDto {
  @ApiProperty({ example: ['id1', 'id2'], description: 'ID товаров' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Выберите хотя бы один товар' })
  @ArrayMaxSize(MAX_BULK_IDS, { message: `Максимум ${MAX_BULK_IDS} товаров за раз` })
  @IsString({ each: true })
  productIds: string[];
}
