import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateDirectorMessageBlockDto {
  @ApiPropertyOptional({
    example: 'director@company.ru',
    description: 'Email директора, на который будут приходить письма из формы',
  })
  @IsOptional()
  @ValidateIf((o) => o.directorEmail !== '' && o.directorEmail != null)
  @IsEmail()
  directorEmail?: string | null;

  @ApiPropertyOptional({
    example: '-1001234567890',
    description: 'ID чата Telegram для уведомлений (нужен TELEGRAM_BOT_TOKEN в .env)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telegramChatId?: string | null;
}
