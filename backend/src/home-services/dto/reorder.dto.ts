import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

const MAX_REORDER_IDS = 500;

export class ReorderDto {
  @ApiProperty({ type: [String], example: ['id1', 'id2', 'id3'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_REORDER_IDS, { message: `Максимум ${MAX_REORDER_IDS} элементов` })
  ids: string[];
}
