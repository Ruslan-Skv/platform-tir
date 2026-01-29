import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateHeroFeatureDto {
  @ApiProperty({ example: '🏭', description: 'Emoji или URL загруженной иконки' })
  @IsString()
  @MaxLength(500)
  icon: string;

  @ApiProperty({ example: 'Собственное производство' })
  @IsString()
  @MaxLength(200)
  title: string;
}
