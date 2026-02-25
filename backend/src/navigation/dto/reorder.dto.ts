import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, ArrayMaxSize, IsString } from 'class-validator';

const MAX_REORDER_IDS = 500;

export class ReorderDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_REORDER_IDS, { message: `Максимум ${MAX_REORDER_IDS} элементов` })
  @IsString({ each: true })
  ids: string[];
}
