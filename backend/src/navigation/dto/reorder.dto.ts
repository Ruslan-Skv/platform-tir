import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsString } from 'class-validator';

export class ReorderDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}
