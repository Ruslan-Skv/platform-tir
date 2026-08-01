import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateAdminNotificationsDto {
  @ApiPropertyOptional({ description: 'Включить звук при событиях' })
  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Громкость звука 0-100', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  soundVolume?: number;

  @ApiPropertyOptional({ description: 'Тип звука: beep, ding, chime, bell, custom' })
  @IsOptional()
  @IsIn(['beep', 'ding', 'chime', 'bell', 'custom'])
  soundType?: string;

  @ApiPropertyOptional({ description: 'URL загруженного звука (при soundType=custom)' })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsString()
  customSoundUrl?: string | null;

  @ApiPropertyOptional({ description: 'Браузерные уведомления на рабочем столе' })
  @IsOptional()
  @IsBoolean()
  desktopNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Интервал проверки (секунды)', minimum: 30, maximum: 300 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(300)
  checkIntervalSeconds?: number;

  @ApiPropertyOptional({ description: 'Уведомления о новых отзывах' })
  @IsOptional()
  @IsBoolean()
  notifyOnReviews?: boolean;

  @ApiPropertyOptional({ description: 'Уведомления о новых заказах' })
  @IsOptional()
  @IsBoolean()
  notifyOnOrders?: boolean;

  @ApiPropertyOptional({ description: 'Уведомления о сообщениях в чате поддержки' })
  @IsOptional()
  @IsBoolean()
  notifyOnSupportChat?: boolean;

  @ApiPropertyOptional({ description: 'Уведомления о записи на замер' })
  @IsOptional()
  @IsBoolean()
  notifyOnMeasurementForm?: boolean;

  @ApiPropertyOptional({ description: 'Уведомления о заказе обратного звонка' })
  @IsOptional()
  @IsBoolean()
  notifyOnCallbackForm?: boolean;

  @ApiPropertyOptional({ description: 'Уведомления о письме директору' })
  @IsOptional()
  @IsBoolean()
  notifyOnDirectorForm?: boolean;

  @ApiPropertyOptional({ description: 'Уведомления о заявке на расчёт стоимости' })
  @IsOptional()
  @IsBoolean()
  notifyOnQuoteForm?: boolean;

  @ApiPropertyOptional({ description: 'Заявки с квиза mebel-na-zakaz-51.ru' })
  @IsOptional()
  @IsBoolean()
  notifyOnQuizMebel?: boolean;

  @ApiPropertyOptional({ description: 'Заявки с квиза remont-kvartir-51.ru' })
  @IsOptional()
  @IsBoolean()
  notifyOnQuizRemont?: boolean;

  @ApiPropertyOptional({ description: 'Обратная связь по обучающей платформе' })
  @IsOptional()
  @IsBoolean()
  notifyOnKnowledgeFeedback?: boolean;

  @ApiPropertyOptional({ description: 'Обратная связь по публичному сайту' })
  @IsOptional()
  @IsBoolean()
  notifyOnSiteFeedback?: boolean;

  @ApiPropertyOptional({ description: 'Динамика изучения материалов обучающей платформы' })
  @IsOptional()
  @IsBoolean()
  notifyOnKnowledgeTraining?: boolean;

  @ApiPropertyOptional({ description: 'Учёт рабочего времени (опоздания, ранний уход и т.д.)' })
  @IsOptional()
  @IsBoolean()
  notifyOnWorkDays?: boolean;

  @ApiPropertyOptional({ description: 'Путевой лист (новые задания, правки, выполнение)' })
  @IsOptional()
  @IsBoolean()
  notifyOnWaybills?: boolean;

  @ApiPropertyOptional({
    description: 'Роль для профиля настроек (null/default = для всех, ADMIN, MODERATOR и т.д.)',
  })
  @IsOptional()
  @IsString()
  role?: string | null;
}
