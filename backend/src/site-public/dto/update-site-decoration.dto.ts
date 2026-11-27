import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateSiteDecorationDto {
  @ApiPropertyOptional({ description: 'Включено ли украшение на публичном сайте.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Начало периода показа (ISO 8601). null — сбросить ограничение.',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @ApiPropertyOptional({
    description: 'Конец периода показа (ISO 8601). null — сбросить ограничение.',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @ApiPropertyOptional({
    description: 'Вариант украшения (например, вид гирлянды). null — первый вариант реестра.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  variant?: string | null;
}
