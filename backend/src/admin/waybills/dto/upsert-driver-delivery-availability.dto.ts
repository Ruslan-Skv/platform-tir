import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class DriverDeliveryCycleDayDto {
  @ApiProperty({ enum: ['ON', 'OFF'] })
  @IsIn(['ON', 'OFF'])
  kind: 'ON' | 'OFF';

  @ApiPropertyOptional({ example: '15:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'availableFrom must be HH:mm' })
  availableFrom?: string | null;

  @ApiPropertyOptional({ example: '23:59' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'availableTo must be HH:mm' })
  availableTo?: string | null;
}

export class DriverDeliveryAbsenceBlockDto {
  @ApiProperty({ enum: ['VACATION', 'SICK'] })
  @IsIn(['VACATION', 'SICK'])
  kind: 'VACATION' | 'SICK';

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ example: '2026-08-14' })
  @IsDateString()
  dateTo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class UpsertDriverDeliveryAvailabilityDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  cycleAnchorDate: string;

  @ApiProperty({ type: [DriverDeliveryCycleDayDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DriverDeliveryCycleDayDto)
  cycleDays: DriverDeliveryCycleDayDto[];

  @ApiPropertyOptional({ type: [DriverDeliveryAbsenceBlockDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriverDeliveryAbsenceBlockDto)
  absenceBlocks?: DriverDeliveryAbsenceBlockDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
