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

/** Личные настройки: доставка + опциональные личные переопределения событий notify*. */
export class UpdateMyAdminNotificationDeliveryDto {
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

  @ApiPropertyOptional({ description: 'Браузерные уведомления на рабочем столе / PWA' })
  @IsOptional()
  @IsBoolean()
  desktopNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Интервал проверки (секунды)', minimum: 30, maximum: 300 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(300)
  checkIntervalSeconds?: number;

  @ApiPropertyOptional({ description: 'Личное переопределение: новые отзывы' })
  @IsOptional()
  @IsBoolean()
  notifyOnReviews?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: новые заказы' })
  @IsOptional()
  @IsBoolean()
  notifyOnOrders?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: чат поддержки' })
  @IsOptional()
  @IsBoolean()
  notifyOnSupportChat?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: заявка на замер' })
  @IsOptional()
  @IsBoolean()
  notifyOnMeasurementForm?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: заявка на обратный звонок' })
  @IsOptional()
  @IsBoolean()
  notifyOnCallbackForm?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: заявка директору' })
  @IsOptional()
  @IsBoolean()
  notifyOnDirectorForm?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: заявка на расчёт' })
  @IsOptional()
  @IsBoolean()
  notifyOnQuoteForm?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: квиз «Мебель»' })
  @IsOptional()
  @IsBoolean()
  notifyOnQuizMebel?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: квиз «Ремонт»' })
  @IsOptional()
  @IsBoolean()
  notifyOnQuizRemont?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: обратная связь по обучению' })
  @IsOptional()
  @IsBoolean()
  notifyOnKnowledgeFeedback?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: обратная связь сайта' })
  @IsOptional()
  @IsBoolean()
  notifyOnSiteFeedback?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: динамика обучения' })
  @IsOptional()
  @IsBoolean()
  notifyOnKnowledgeTraining?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: рабочие дни' })
  @IsOptional()
  @IsBoolean()
  notifyOnWorkDays?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: путевые листы' })
  @IsOptional()
  @IsBoolean()
  notifyOnWaybills?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: график монтажей' })
  @IsOptional()
  @IsBoolean()
  notifyOnInstallationSchedules?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: график ремонтов' })
  @IsOptional()
  @IsBoolean()
  notifyOnRepairSchedules?: boolean;

  @ApiPropertyOptional({ description: 'Личное переопределение: график мебели' })
  @IsOptional()
  @IsBoolean()
  notifyOnFurnitureSchedules?: boolean;
}
