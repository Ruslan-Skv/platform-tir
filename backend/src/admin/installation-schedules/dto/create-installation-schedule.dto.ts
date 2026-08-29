import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { INSTALLATION_SCHEDULE_DIRECTIONS } from '../installation-schedule-directions.constant';

export class InstallationContactPersonDto {
  @ApiProperty({ example: 'Иванов Иван' })
  @IsString()
  @MaxLength(500)
  name: string;

  @ApiPropertyOptional({ type: [String], example: ['+79001234567'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  phones?: string[];
}

export class CreateInstallationScheduleDto {
  @ApiProperty({ example: '2026-08-04', description: 'Дата начала монтажа (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    example: '2026-08-06',
    description: 'Дата окончания (включительно). Пусто / равно date — один день',
  })
  @IsOptional()
  @IsDateString()
  dateEnd?: string | null;

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

  @ApiPropertyOptional({
    type: [String],
    description: 'Несколько монтажников из справочника (приоритетнее installerId)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  installerIds?: string[] | null;

  @ApiPropertyOptional({
    description: 'ФИО монтажника(ов) вручную; несколько — через запятую',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
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

  @ApiPropertyOptional({
    type: [InstallationContactPersonDto],
    description: 'Контактные лица на объекте (принимают монтажников вместо заказчика)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstallationContactPersonDto)
  contactPersons?: InstallationContactPersonDto[] | null;
}
