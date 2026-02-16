import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, ValidateIf } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Уведомлять при ответе в чате поддержки' })
  @IsOptional()
  @IsBoolean()
  notifyOnSupportChatReply?: boolean;

  @ApiPropertyOptional({
    description:
      'Кол-во карточек в строке в каталоге на мобильном: 1 или 2. null = по умолчанию сайта',
    enum: [1, 2],
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsIn([1, 2])
  mobileCatalogColumns?: 1 | 2 | null;
}
