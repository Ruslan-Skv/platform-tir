import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateSubItemDto {
  @ApiProperty({ description: 'Название подпункта' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Ссылка', default: '#' })
  @IsString()
  @MaxLength(500)
  href: string;
}
