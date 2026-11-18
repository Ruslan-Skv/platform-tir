import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class UpdateWindowsSettingsDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  heroImageUrl?: string;

  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsOptional()
  seoDescription?: string;

  // Таблица сравнения
  @IsBoolean()
  @IsOptional()
  comparisonShow?: boolean;

  @IsString()
  @IsOptional()
  comparisonTitle?: string;

  @IsString()
  @IsOptional()
  comparisonNote?: string;

  @IsBoolean()
  @IsOptional()
  comparisonShowChambers?: boolean;

  @IsBoolean()
  @IsOptional()
  comparisonShowDepth?: boolean;

  @IsBoolean()
  @IsOptional()
  comparisonShowGlass?: boolean;

  @IsBoolean()
  @IsOptional()
  comparisonShowThermal?: boolean;

  @IsBoolean()
  @IsOptional()
  comparisonShowSound?: boolean;

  // CTA-блок «Поможем выбрать профиль»
  @IsString()
  @IsOptional()
  ctaBackgroundColor?: string;

  @IsString()
  @IsOptional()
  ctaBackgroundImage?: string;

  /** cover (заполнить с обрезкой) | contain (вписать) | tile (замостить) */
  @IsString()
  @IsOptional()
  ctaBackgroundFit?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  ctaBackgroundImageOpacity?: number;

  @IsString()
  @IsOptional()
  ctaTextColor?: string;

  @IsBoolean()
  @IsOptional()
  ctaShowButtons?: boolean;
}
