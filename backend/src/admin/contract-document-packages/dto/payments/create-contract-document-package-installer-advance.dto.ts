import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateContractDocumentPackageInstallerAdvanceDto {
  @ApiProperty({ description: 'Мастер из справочника (CRM → Мастера)' })
  @IsString()
  installerId: string;

  @ApiProperty({ description: 'Дата выдачи аванса' })
  @IsDateString()
  paidAt: string;

  @ApiProperty({ description: 'Сумма аванса, руб.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Комментарий (за что выдан аванс)' })
  @IsOptional()
  @IsString()
  note?: string;
}
