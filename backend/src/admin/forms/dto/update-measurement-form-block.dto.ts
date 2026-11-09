import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeasurementFormBlockDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Email для получения уведомлений о новых заявках на замер',
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  notifyEmails?: string[];

  @ApiPropertyOptional({
    description: 'Список позиций «Интересующий товар» в форме записи на замер',
    example: ['Межкомнатные двери', 'Окна', 'Ремонт квартиры'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  productTypeOptions?: string[] | null;

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
