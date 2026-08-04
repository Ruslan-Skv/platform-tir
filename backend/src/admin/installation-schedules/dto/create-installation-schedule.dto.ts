import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { INSTALLATION_SCHEDULE_DIRECTIONS } from '../installation-schedule-directions.constant';

export class CreateInstallationScheduleDto {
  @ApiProperty({ example: '2026-08-04' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '10:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  timeFrom?: string | null;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  timeTo?: string | null;

  @ApiPropertyOptional({ example: 'к 10.00' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeText?: string | null;

  @ApiProperty({ example: 'DOORS', enum: INSTALLATION_SCHEDULE_DIRECTIONS })
  @IsString()
  @IsIn([...INSTALLATION_SCHEDULE_DIRECTIONS])
  direction: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  orderInfo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string | null;

  @ApiPropertyOptional({ description: 'ID мастера из справочника /admin/crm/installers' })
  @IsOptional()
  @IsString()
  installerId?: string | null;

  @ApiPropertyOptional({ description: 'ФИО мастера вручную (без привязки к справочнику)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  installerName?: string | null;

  @ApiPropertyOptional({ description: 'Пакет документов договора' })
  @IsOptional()
  @IsString()
  packageId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string | null;

  @ApiPropertyOptional({ description: 'Номер договора вручную' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contractNumber?: string | null;

  @ApiPropertyOptional({ example: 'workOrder' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  workOrderKey?: string | null;

  @ApiPropertyOptional({ description: 'Заказ-наряд вручную (без привязки к пакету)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  workOrderLabel?: string | null;

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
  @MaxLength(50)
  customerPhone?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  customerPhones?: string[] | null;
}
