import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RepairScheduleEntryKind } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRepairScheduleEntryDto {
  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ enum: RepairScheduleEntryKind })
  @IsOptional()
  @IsEnum(RepairScheduleEntryKind)
  kind?: RepairScheduleEntryKind;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text: string;
}
