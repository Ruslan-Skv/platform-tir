import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfficeIncassationDto {
  @ApiProperty()
  @IsString()
  officeId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsDateString()
  incassationDate: string;

  @ApiPropertyOptional({ description: 'ФИО или данные того, кто произвёл инкассацию' })
  @IsOptional()
  @IsString()
  incassator?: string;

  @ApiPropertyOptional({ description: 'Например: Инкассация за неделю' })
  @IsOptional()
  @IsString()
  notes?: string;
}
