import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MinLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Вопрос-ответ блока FAQ на публичной странице. */
export class FaqItemDto {
  @IsString()
  @MinLength(1, { message: 'Вопрос обязателен' })
  question: string;

  @IsString()
  @MinLength(1, { message: 'Ответ обязателен' })
  answer: string;
}

/** Этап работы над заказом на публичной странице. */
export class StepItemDto {
  @IsString()
  @MinLength(1, { message: 'Название этапа обязательно' })
  title: string;

  @IsString()
  @MinLength(1, { message: 'Описание этапа обязательно' })
  description: string;
}

export class UpdateStretchCeilingsSettingsDto {
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

  // Таблица сравнения фактур
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
  comparisonShowTexture?: boolean;

  @IsBoolean()
  @IsOptional()
  comparisonShowWidth?: boolean;

  @IsBoolean()
  @IsOptional()
  comparisonShowPrice?: boolean;

  @IsBoolean()
  @IsOptional()
  comparisonShowCountry?: boolean;

  // Калькулятор стоимости
  @IsBoolean()
  @IsOptional()
  calcShow?: boolean;

  @IsString()
  @IsOptional()
  calcTitle?: string;

  @IsString()
  @IsOptional()
  calcNote?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  calcPricePerMeterBaget?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  calcPricePerCorner?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  calcPricePerLight?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  calcPricePerPipe?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  calcLightOptionPrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  calcCorniceOptionPrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  calcMinOrder?: number;

  // Этапы работы
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepItemDto)
  @IsOptional()
  steps?: StepItemDto[];

  // FAQ
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  @IsOptional()
  faq?: FaqItemDto[];

  // CTA-блок «Поможем выбрать потолок»
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
