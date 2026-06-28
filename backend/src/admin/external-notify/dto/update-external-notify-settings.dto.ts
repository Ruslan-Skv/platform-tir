import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateExternalNotifySettingsDto {
  @ApiPropertyOptional({ type: [String], description: 'Email для уведомлений о новых заказах' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  orderNotifyEmails?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Telegram chat ID для новых заказов' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orderNotifyTelegramIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'MAX chat ID для новых заказов' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orderNotifyMaxIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Email для обратной связи по обучающей платформе',
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  knowledgeFeedbackNotifyEmails?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Telegram chat ID для обратной связи по обучающей платформе',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knowledgeFeedbackNotifyTelegramIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'MAX chat ID для обратной связи по обучающей платформе',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knowledgeFeedbackNotifyMaxIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Email для обратной связи по сайту' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  siteFeedbackNotifyEmails?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Telegram chat ID для обратной связи по сайту',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  siteFeedbackNotifyTelegramIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'MAX chat ID для обратной связи по сайту' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  siteFeedbackNotifyMaxIds?: string[];
}
