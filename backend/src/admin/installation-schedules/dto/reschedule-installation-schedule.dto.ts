import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RescheduleInstallationScheduleDto {
  @ApiProperty({ example: '2026-08-05', description: 'Новая дата начала' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    example: '2026-08-07',
    description: 'Новая дата окончания; если не указана — сохраняется длительность диапазона',
  })
  @IsOptional()
  @IsDateString()
  dateEnd?: string | null;

  @ApiPropertyOptional({ example: '15:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  timeFrom?: string | null;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  timeTo?: string | null;

  @ApiPropertyOptional({ example: 'к 15.00' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeText?: string | null;
}
