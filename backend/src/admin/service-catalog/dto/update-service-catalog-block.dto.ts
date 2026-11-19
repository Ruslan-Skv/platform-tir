import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Преимущество в hero-блоке страницы «Ремонт квартир». */
export class ServiceCatalogHeroNoteDto {
  @IsString()
  @IsOptional()
  icon?: string | null;

  @IsString()
  text!: string;
}

/** Этап работы в секции «Этапы работы». */
export class ServiceCatalogStepDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  /** Фоновая картинка карточки этапа (URL или data URL) */
  @IsString()
  @IsOptional()
  backgroundImage?: string | null;
}

export class UpdateServiceCatalogBlockDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  showPricesInPublic?: boolean;

  // Hero-блок
  @IsString()
  @IsOptional()
  subtitle?: string | null;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsOptional()
  heroImageUrl?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceCatalogHeroNoteDto)
  @IsOptional()
  heroNotes?: ServiceCatalogHeroNoteDto[] | null;

  @IsString()
  @IsOptional()
  seoTitle?: string | null;

  @IsString()
  @IsOptional()
  seoDescription?: string | null;

  // Этапы работы
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceCatalogStepDto)
  @IsOptional()
  steps?: ServiceCatalogStepDto[] | null;

  /** Прозрачный фон карточек этапов работы — виден общий фон страницы */
  @IsBoolean()
  @IsOptional()
  stepsCardTransparent?: boolean;

  // SEO-текст внизу
  @IsString()
  @IsOptional()
  seoTextTitle?: string | null;

  @IsString()
  @IsOptional()
  seoText?: string | null;

  // CTA-блок
  @IsString()
  @IsOptional()
  ctaTitle?: string | null;

  @IsString()
  @IsOptional()
  ctaText?: string | null;

  @IsString()
  @IsOptional()
  ctaBackgroundColor?: string | null;

  @IsString()
  @IsOptional()
  ctaTextColor?: string | null;

  @IsString()
  @IsOptional()
  ctaBackgroundImage?: string | null;

  @IsIn(['cover', 'contain', 'tile'])
  @IsOptional()
  ctaBackgroundFit?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  ctaBackgroundImageOpacity?: number;

  @IsBoolean()
  @IsOptional()
  ctaShowButtons?: boolean;
}
