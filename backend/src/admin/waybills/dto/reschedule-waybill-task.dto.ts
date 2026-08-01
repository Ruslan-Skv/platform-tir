import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class RescheduleWaybillTaskDto {
  @ApiProperty({ example: '2026-08-05', description: 'Новая дата задания' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '15:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'timeFrom must be HH:mm' })
  timeFrom?: string | null;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'timeTo must be HH:mm' })
  timeTo?: string | null;
}
