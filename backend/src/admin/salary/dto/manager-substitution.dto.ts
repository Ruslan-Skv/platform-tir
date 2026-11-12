import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateManagerSubstitutionDto {
  @ApiProperty({ description: 'Менеджер, которого подменяют (отпуск/больничный)' })
  @IsString()
  absentManagerId: string;

  @ApiProperty({ description: 'Менеджер, который подменяет и получает за него з/п' })
  @IsString()
  substituteManagerId: string;

  @ApiProperty()
  @IsDateString()
  dateFrom: string;

  @ApiProperty()
  @IsDateString()
  dateTo: string;

  @ApiPropertyOptional({ description: 'Например: «отпуск», «больничный до 20-го»' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class UpdateManagerSubstitutionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  absentManagerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  substituteManagerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string | null;
}
