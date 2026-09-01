import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateUserCabinetDto {
  @ApiPropertyOptional({ description: 'Показывать раздел «Личные данные»' })
  @IsOptional()
  @IsBoolean()
  showProfileSection?: boolean;

  @ApiPropertyOptional({ description: 'Показывать раздел «История» (заказы, договоры, оплаты)' })
  @IsOptional()
  @IsBoolean()
  showOrdersSection?: boolean;

  @ApiPropertyOptional({ description: 'Показывать раздел «Уведомления»' })
  @IsOptional()
  @IsBoolean()
  showNotificationsSection?: boolean;

  @ApiPropertyOptional({ description: 'Показывать историю уведомлений (только чтение)' })
  @IsOptional()
  @IsBoolean()
  showNotificationHistory?: boolean;

  @ApiPropertyOptional({ description: 'Показывать раздел «Смена пароля»' })
  @IsOptional()
  @IsBoolean()
  showPasswordSection?: boolean;

  @ApiPropertyOptional({ description: 'Показывать быстрые ссылки' })
  @IsOptional()
  @IsBoolean()
  showQuickLinks?: boolean;

  @ApiPropertyOptional({
    description: 'URL PDF политики конфиденциальности (единая для сайта и квизов)',
  })
  @IsOptional()
  @IsString()
  privacyPolicyUrl?: string | null;

  @ApiPropertyOptional({ description: 'Заголовок политики конфиденциальности' })
  @IsOptional()
  @IsString()
  privacyPolicyTitle?: string | null;

  @ApiPropertyOptional({ description: 'Текст политики конфиденциальности (если нет PDF)' })
  @IsOptional()
  @IsString()
  privacyPolicyContent?: string | null;

  @ApiPropertyOptional({ description: 'Текст согласия рядом с галочкой' })
  @IsOptional()
  @IsString()
  consentText?: string | null;

  @ApiPropertyOptional({ description: 'Кликабельная фраза в тексте согласия' })
  @IsOptional()
  @IsString()
  consentLinkText?: string | null;
}
