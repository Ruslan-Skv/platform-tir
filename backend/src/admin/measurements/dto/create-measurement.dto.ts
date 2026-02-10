import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MeasurementStatusDto {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  CONVERTED = 'CONVERTED',
}

export class CreateMeasurementDto {
  @ApiProperty({ description: 'ID менеджера (cuid)' })
  @IsString()
  managerId: string;

  @ApiProperty()
  @IsDateString()
  receptionDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  executionDate?: string;

  @ApiPropertyOptional({ description: 'ID замерщика (cuid)' })
  @IsOptional()
  @IsString()
  surveyorId?: string;

  @ApiPropertyOptional({ description: 'ID направления (cuid)' })
  @IsOptional()
  @IsString()
  directionId?: string;

  @ApiProperty()
  @IsString()
  customerName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiProperty()
  @IsString()
  customerPhone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ enum: MeasurementStatusDto, default: 'NEW' })
  @IsOptional()
  @IsEnum(MeasurementStatusDto)
  status?: MeasurementStatusDto = MeasurementStatusDto.NEW;

  @ApiPropertyOptional({ description: 'ID клиента (cuid)' })
  @IsOptional()
  @IsString()
  customerId?: string;
}
