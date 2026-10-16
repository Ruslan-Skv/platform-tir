import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

import { CreateInstallerAdvanceSheetItemDto } from './installer-advance-sheet-items.dto';

/**
 * Редактирование ведомости: строки передаются полностью (новый список
 * невыданных строк; выплаченные строки не передаются и не меняются).
 * Мастера можно поменять, только если в ведомости нет выданных строк.
 */
export class UpdateInstallerAdvanceSheetDto {
  @ApiPropertyOptional({ description: 'Мастер из справочника (только пока нет выданных строк)' })
  @IsOptional()
  @IsString()
  installerId?: string;

  @ApiPropertyOptional({ description: 'Примечание к ведомости' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({
    type: [CreateInstallerAdvanceSheetItemDto],
    description: 'Полный новый список невыданных строк (выплаченные остаются как есть)',
  })
  @IsOptional()
  @IsArray()
  items?: CreateInstallerAdvanceSheetItemDto[];
}
