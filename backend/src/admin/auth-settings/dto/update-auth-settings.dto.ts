import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAuthSettingsDto {
  @ApiPropertyOptional({ description: 'Разрешить вход через Сбер ID' })
  @IsOptional()
  @IsBoolean()
  sberAuthEnabled?: boolean;
}
