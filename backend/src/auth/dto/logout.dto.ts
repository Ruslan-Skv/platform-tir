import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

/** Refresh в httpOnly cookie; поле опционально для совместимости со старыми клиентами. */
export class LogoutDto {
  @ApiPropertyOptional({ description: 'Устарело: refresh в cookie' })
  @IsOptional()
  @IsString()
  @MinLength(32)
  refresh_token?: string;
}
