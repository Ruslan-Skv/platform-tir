import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FurnitureScheduleEntryKind } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFurnitureScheduleEntryDto {
  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ enum: FurnitureScheduleEntryKind })
  @IsOptional()
  @IsEnum(FurnitureScheduleEntryKind)
  kind?: FurnitureScheduleEntryKind;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text: string;
}
