import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

import { CreateInstallerAdvanceSheetItemDto } from './installer-advance-sheet-items.dto';

/**
 * Создание ведомости выплаты авансов мастеру: один мастер и 1–10 строк
 * «договор → сумма». Создаёт ведущий специалист / бригадир.
 */
export class CreateInstallerAdvanceSheetDto {
  @IsString()
  installerId: string;

  @ApiPropertyOptional({ description: 'Примечание к ведомости' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  items: CreateInstallerAdvanceSheetItemDto[];
}
