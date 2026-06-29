import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSiteDisclaimerDto {
  @ApiPropertyOptional({ description: 'Текст правовой оговорки на сайте' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Показывать текст на сайте' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
