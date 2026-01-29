import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateHeroFeatureDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}
