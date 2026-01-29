import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateAdvantageItemDto {
  @ApiProperty({ example: '🏭' })
  @IsString()
  @MaxLength(500)
  icon: string;

  @ApiProperty({ example: 'Собственное производство' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Изготавливаем мебель на собственном производстве' })
  @IsString()
  @MaxLength(1000)
  description: string;
}
