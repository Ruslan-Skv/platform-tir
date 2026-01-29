import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateHeroBlockDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  titleMain?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  titleAccent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subtitle?: string;
}
