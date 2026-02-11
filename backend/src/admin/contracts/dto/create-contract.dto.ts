import { IsString, IsOptional, IsDateString, IsEnum, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ContractStatusDto {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export class CreateContractDto {
  @ApiProperty()
  @IsString()
  contractNumber: string;

  @ApiProperty()
  @IsDateString()
  contractDate: string;

  @ApiPropertyOptional({ enum: ContractStatusDto })
  @IsOptional()
  @IsEnum(ContractStatusDto)
  status?: ContractStatusDto = ContractStatusDto.DRAFT;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  directionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  surveyorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complexObjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validityStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validityEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  contractDurationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractDurationType?: string; // CALENDAR | WORKING

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  installationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  installationDurationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount?: number = 0;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  totalAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  advanceAmount?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredExecutorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  measurementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actWorkStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actWorkEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  goodsTransferDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  installers?: string[] = [];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actWorkStartImages?: string[] = [];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actWorkEndImages?: string[] = [];
}
