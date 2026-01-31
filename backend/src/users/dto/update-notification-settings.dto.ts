import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Уведомлять при ответе в чате поддержки' })
  @IsOptional()
  @IsBoolean()
  notifyOnSupportChatReply?: boolean;
}
