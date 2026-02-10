import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateContractAmendmentDto {
  /** Изменение стоимости: + увеличение, − уменьшение, 0 без изменений */
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  /** Скидка по д/с (₽) */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount?: number;

  @ApiProperty()
  @IsDateString({ strict: false })
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  extendsValidityTo?: string;

  /** Дней к сроку договора (0 или null = без изменений). Только увеличение. */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  durationAdditionDays?: number;

  /** CALENDAR | WORKING — тип дней для durationAdditionDays */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  durationAdditionType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
