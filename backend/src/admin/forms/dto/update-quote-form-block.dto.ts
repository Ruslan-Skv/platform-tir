import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateQuoteFormBlockDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Email для получения уведомлений о заявках на расчёт стоимости',
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  notifyEmails?: string[];

  @ApiPropertyOptional({
    description: 'Список видов работ/товаров для выбора в форме (отображаются чекбоксами)',
    example: ['Межкомнатные двери', 'Окна', 'Мебель'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  serviceTypeOptions?: string[] | null;

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
