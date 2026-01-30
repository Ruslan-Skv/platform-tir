import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateFooterSectionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  title: string;
}
