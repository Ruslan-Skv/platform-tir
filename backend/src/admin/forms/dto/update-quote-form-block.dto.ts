import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateQuoteFormBlockDto {
  @ApiPropertyOptional({
    example: 'manager@company.ru',
    description: 'Email для получения уведомлений о заявках на расчёт стоимости',
  })
  @IsOptional()
  @ValidateIf((o) => o.recipientEmail !== '' && o.recipientEmail != null)
  @IsEmail()
  recipientEmail?: string | null;

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
    example: '-1001234567890',
    description: 'ID чата Telegram для уведомлений (нужен TELEGRAM_BOT_TOKEN в .env)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telegramChatId?: string | null;
}
