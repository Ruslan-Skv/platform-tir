import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class FailWaybillTaskDto {
  @ApiProperty({ description: 'Причина невыполнения' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  note: string;
}
