import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateContactFormBlockDto {
  @ApiPropertyOptional({ description: 'Заголовок блока' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Подзаголовок блока' })
  @IsOptional()
  @IsString()
  subtitle?: string;
}
