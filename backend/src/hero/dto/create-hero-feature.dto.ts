import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateHeroFeatureDto {
  @ApiProperty({ example: '🏭' })
  @IsString()
  @MaxLength(10)
  icon: string;

  @ApiProperty({ example: 'Собственное производство' })
  @IsString()
  @MaxLength(200)
  title: string;
}
