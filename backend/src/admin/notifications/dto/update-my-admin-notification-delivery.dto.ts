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

/** Только доставка: звук / desktop / интервал. События notify* остаются от роли. */
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
}
