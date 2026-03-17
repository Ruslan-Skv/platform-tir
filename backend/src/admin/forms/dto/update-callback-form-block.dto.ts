import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, ValidateIf } from 'class-validator';

export class UpdateCallbackFormBlockDto {
  @ApiPropertyOptional({
    example: 'manager@company.ru',
    description: 'Email для получения уведомлений о заказах обратного звонка',
  })
  @IsOptional()
  @ValidateIf((o) => o.recipientEmail !== '' && o.recipientEmail != null)
  @IsEmail()
  recipientEmail?: string | null;
}
