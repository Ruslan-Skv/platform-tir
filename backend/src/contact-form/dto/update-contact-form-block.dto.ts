import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateContactFormBlockDto {
  @ApiPropertyOptional({ description: 'Заголовок блока' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Подзаголовок блока' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ description: 'URL или путь к фоновой картинке' })
  @IsOptional()
  @IsString()
  backgroundImage?: string | null;

  @ApiPropertyOptional({ description: 'Прозрачность фона 0–1', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  backgroundOpacity?: number | null;
}
