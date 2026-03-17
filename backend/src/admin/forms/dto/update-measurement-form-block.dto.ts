import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateMeasurementFormBlockDto {
  @ApiPropertyOptional({
    example: 'manager@company.ru',
    description: 'Email для получения уведомлений о новых заявках на замер',
  })
  @IsOptional()
  @ValidateIf((o) => o.recipientEmail !== '' && o.recipientEmail != null)
  @IsEmail()
  recipientEmail?: string | null;

  @ApiPropertyOptional({
    example: '-1001234567890',
    description: 'ID чата Telegram для уведомлений (нужен TELEGRAM_BOT_TOKEN в .env)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telegramChatId?: string | null;
}
