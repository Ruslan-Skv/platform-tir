import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const HERO_SLIDE_SHOW_MODES = ['auto', 'manual', 'static'] as const;
export type HeroSlideShowMode = (typeof HERO_SLIDE_SHOW_MODES)[number];

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

  @ApiProperty({
    required: false,
    enum: HERO_SLIDE_SHOW_MODES,
    description: 'Режим слайд-шоу: auto — автосмена, manual — только вручную, static — один слайд',
  })
  @IsOptional()
  @IsString()
  @IsIn(HERO_SLIDE_SHOW_MODES)
  slideShowMode?: HeroSlideShowMode;

  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: 100,
    description: 'Зазор между фотографиями в слайдере (0–100 px)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  slideGap?: number;
}
