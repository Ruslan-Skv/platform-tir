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

  @ApiPropertyOptional({ type: [String], description: 'Email для сообщений в чате поддержки' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  supportNotifyEmails?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Telegram chat ID для сообщений в чате поддержки',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportNotifyTelegramIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'MAX chat ID для сообщений в чате поддержки',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportNotifyMaxIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Email для новых отзывов на модерации' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  reviewNotifyEmails?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Telegram chat ID для новых отзывов на модерации',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reviewNotifyTelegramIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'MAX chat ID для новых отзывов на модерации',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reviewNotifyMaxIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Email для новых комментариев пользователей',
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  commentNotifyEmails?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Telegram chat ID для новых комментариев пользователей',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commentNotifyTelegramIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'MAX chat ID для новых комментариев пользователей',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commentNotifyMaxIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Email для динамики изучения материалов обучающей платформы',
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  knowledgeTrainingNotifyEmails?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Telegram chat ID для динамики изучения материалов обучающей платформы',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knowledgeTrainingNotifyTelegramIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'MAX chat ID для динамики изучения материалов обучающей платформы',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knowledgeTrainingNotifyMaxIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Email для уведомлений по учёту рабочего времени',
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  workDayNotifyEmails?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Telegram chat ID для уведомлений по учёту рабочего времени',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workDayNotifyTelegramIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'MAX chat ID для уведомлений по учёту рабочего времени',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workDayNotifyMaxIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Email для уведомлений по путевому листу',
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  waybillNotifyEmails?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Telegram chat ID для уведомлений по путевому листу',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  waybillNotifyTelegramIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'MAX chat ID для уведомлений по путевому листу',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  waybillNotifyMaxIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Email для уведомлений по графику монтажей',
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  installationScheduleNotifyEmails?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Telegram chat ID для уведомлений по графику монтажей',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  installationScheduleNotifyTelegramIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'MAX chat ID для уведомлений по графику монтажей',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  installationScheduleNotifyMaxIds?: string[];
}
