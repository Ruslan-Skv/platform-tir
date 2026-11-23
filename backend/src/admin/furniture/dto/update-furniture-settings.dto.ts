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

/** Карточка блока «Материалы и фурнитура». */
export class MaterialItemDto {
  @IsString()
  @MinLength(1, { message: 'Название материала обязательно' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Описание материала обязательно' })
  description: string;
}

export class UpdateFurnitureSettingsDto {
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

  // Таблица сравнения изделий
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
  comparisonShowConfiguration?: boolean;

  @IsBoolean()
  @IsOptional()
  comparisonShowFacade?: boolean;

  @IsBoolean()
  @IsOptional()
  comparisonShowHardware?: boolean;

  @IsBoolean()
  @IsOptional()
  comparisonShowPrice?: boolean;

  // Блок «Материалы и фурнитура»
  @IsBoolean()
  @IsOptional()
  materialsShow?: boolean;

  @IsString()
  @IsOptional()
  materialsTitle?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialItemDto)
  @IsOptional()
  materials?: MaterialItemDto[];

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

  /** Сборка и установка изделия, ₽ */
  @IsInt()
  @Min(0)
  @IsOptional()
  calcAssemblyPrice?: number;

  /** Опция «Доставка», ₽ */
  @IsInt()
  @Min(0)
  @IsOptional()
  calcDeliveryPrice?: number;

  /** Опция «Премиум-фурнитура (Blum/Hettich)», ₽ за изделие */
  @IsInt()
  @Min(0)
  @IsOptional()
  calcPremiumHardwarePrice?: number;

  /** Минимальная сумма заказа калькулятора, ₽ */
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

  // CTA-блок «Поможем спроектировать мебель»
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
