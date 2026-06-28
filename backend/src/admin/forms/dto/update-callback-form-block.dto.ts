import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateCallbackFormBlockDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Email для получения уведомлений о заказах обратного звонка',
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  notifyEmails?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'ID чатов Telegram (нужен TELEGRAM_BOT_TOKEN в .env)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notifyTelegramIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'ID чатов MAX (нужен MAX_BOT_TOKEN в .env)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notifyMaxIds?: string[];
}
