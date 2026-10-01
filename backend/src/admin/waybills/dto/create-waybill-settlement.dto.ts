import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateWaybillSettlementDto {
  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ example: '2026-10-31' })
  @IsDateString()
  dateTo: string;

  @ApiProperty({ example: 'ckUserID' })
  @IsString()
  driverUserId: string;

  @ApiProperty({ example: 2000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  payoutAmount: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount: number;

  @ApiPropertyOptional({ example: 'Расчёт за октябрь, выплачено наличными' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}
