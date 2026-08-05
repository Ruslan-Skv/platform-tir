import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { FurnitureScheduleProjectStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateFurnitureScheduleProjectDto {
  @ApiPropertyOptional({ enum: FurnitureScheduleProjectStatus })
  @IsOptional()
  @IsEnum(FurnitureScheduleProjectStatus)
  status?: FurnitureScheduleProjectStatus;

  @ApiPropertyOptional({ description: '№ договора изготовления' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contractNumber?: string | null;

  @ApiPropertyOptional({ description: '№ договора монтаж' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  installationContractNumber?: string | null;

  @ApiPropertyOptional({ description: '№ договора техника' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  appliancesContractNumber?: string | null;

  @ApiPropertyOptional({ description: 'Связанный ремонт / примечания' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  repairInfo?: string | null;

  @ApiPropertyOptional({ description: 'ОТЗЫВ' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewInfo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  workScope?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  installerId?: string | null;

  @ApiPropertyOptional({ description: 'Бригада' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  installerName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customerAddress?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerPhone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  contractSum?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payoutSum?: number | null;

  @ApiPropertyOptional({ example: '2026-08-15', description: 'Дата договора' })
  @IsOptional()
  @IsDateString()
  contractDate?: string | null;

  @ApiPropertyOptional({ description: 'Дата КЗ или флаг «кз»' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  kzInfo?: string | null;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  pauseStartDate?: string | null;

  @ApiPropertyOptional({ example: '2026-08-20' })
  @IsOptional()
  @IsDateString()
  pauseResumeDate?: string | null;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  plannedStartDate?: string | null;

  @ApiPropertyOptional({ description: 'Срок договора в рабочих днях' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  workPeriodDays?: number | null;

  @ApiPropertyOptional({
    example: '2026-08-15',
    description: 'Дата начала срока с учётом КЗ',
  })
  @IsOptional()
  @IsDateString()
  workStartActDate?: string | null;

  @ApiPropertyOptional({
    example: '2026-10-15',
    description: 'Дата окончания договора / акт сдачи',
  })
  @IsOptional()
  @IsDateString()
  workCloseActDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string | null;
}
