import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { INSTALLER_DIRECTIONS } from '../installer-directions.constant';

export class CreateInstallerDto {
  @ApiProperty({ enum: INSTALLER_DIRECTIONS })
  @IsString()
  @IsIn(INSTALLER_DIRECTIONS)
  direction: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  grade: string;

  /** Опциональная привязка к аккаунту; null/пусто — работа только по ФИО. */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  userId?: string | null;
}
