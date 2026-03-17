import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, ValidateIf } from 'class-validator';

export class UpdateMeasurementFormBlockDto {
  @ApiPropertyOptional({
    example: 'manager@company.ru',
    description: 'Email для получения уведомлений о новых заявках на замер',
  })
  @IsOptional()
  @ValidateIf((o) => o.recipientEmail !== '' && o.recipientEmail != null)
  @IsEmail()
  recipientEmail?: string | null;
}
