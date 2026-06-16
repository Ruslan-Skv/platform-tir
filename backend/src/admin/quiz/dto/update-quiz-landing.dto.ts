import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class QuizThemeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  background?: string;

  @ApiPropertyOptional({ description: 'URL фоновой картинки (пусто — только цвет/градиент)' })
  @IsOptional()
  @IsString()
  backgroundImageUrl?: string | null;

  @ApiPropertyOptional({ description: 'Прозрачность фона 0–100' })
  @IsOptional()
  backgroundImageOpacity?: number;

  @ApiPropertyOptional({ description: 'Яркость фона 0–200 (%), 100 = без изменений' })
  @IsOptional()
  backgroundImageBrightness?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headingColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mutedTextColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cardBackground?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cardBorder?: string;

  @ApiPropertyOptional({ description: 'Макс. ширина блока шагов, px' })
  @IsOptional()
  stepBlockMaxWidth?: number;

  @ApiPropertyOptional({ description: 'Внутренние отступы блока шагов, px' })
  @IsOptional()
  stepBlockPadding?: number;

  @ApiPropertyOptional({ description: 'Скругление блока шагов, px' })
  @IsOptional()
  stepBlockBorderRadius?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buttonTextColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headingFontFamily?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityBadgeBackground?: string;

  @ApiPropertyOptional({ description: 'Прозрачность фона бейджа, 0–100' })
  @IsOptional()
  cityBadgeBackgroundOpacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityBadgeTextColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityBadgeIconColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityBadgeBorderColor?: string;

  @ApiPropertyOptional({ description: 'Размер текста бейджа города, px' })
  @IsOptional()
  cityBadgeFontSize?: number;

  @ApiPropertyOptional({ description: 'Горизонтальные отступы бейджа, px' })
  @IsOptional()
  cityBadgePaddingX?: number;

  @ApiPropertyOptional({ description: 'Вертикальные отступы бейджа, px' })
  @IsOptional()
  cityBadgePaddingY?: number;

  @ApiPropertyOptional({ description: 'Скругление бейджа, px' })
  @IsOptional()
  cityBadgeBorderRadius?: number;

  @ApiPropertyOptional({ description: 'Размер иконки геолокации, px' })
  @IsOptional()
  cityBadgeIconSize?: number;

  @ApiPropertyOptional({ description: 'Толщина рамки бейджа, px' })
  @IsOptional()
  cityBadgeBorderWidth?: number;

  @ApiPropertyOptional({ description: 'Непрозрачность тени бейджа, 0–100' })
  @IsOptional()
  cityBadgeShadowOpacity?: number;
}

export class UpdateQuizLandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  domain?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  headline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subheadline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  promoText?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string;

  @ApiPropertyOptional({ type: QuizThemeDto })
  @IsOptional()
  @IsObject()
  theme?: QuizThemeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  displayPhone?: string | null;

  @ApiPropertyOptional({ description: 'Адрес для бейджа в шапке и поиска на карте' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  city?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  successTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successText?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catalogFileUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  privacyPolicyUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  privacyPolicyTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  privacyPolicyContent?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  consentText?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  consentLinkText?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notifyEmails?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notifyTelegramIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notifyPhones?: string[];
}
