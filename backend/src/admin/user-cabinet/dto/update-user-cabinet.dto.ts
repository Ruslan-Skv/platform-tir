import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserCabinetDto {
  @ApiPropertyOptional({ description: 'Показывать раздел «Личные данные»' })
  @IsOptional()
  @IsBoolean()
  showProfileSection?: boolean;

  @ApiPropertyOptional({ description: 'Показывать раздел «Мои заказы»' })
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
}
