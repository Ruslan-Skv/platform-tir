import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsString } from 'class-validator';

export class ProductIdsDto {
  @ApiProperty({ example: ['id1', 'id2'], description: 'ID товаров' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Выберите хотя бы один товар' })
  @IsString({ each: true })
  productIds: string[];
}
