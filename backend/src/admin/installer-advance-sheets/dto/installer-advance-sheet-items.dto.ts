import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, Min } from 'class-validator';

/** Строка ведомости: аванс по конкретному договору. */
export class CreateInstallerAdvanceSheetItemDto {
  @ApiProperty({ description: 'Договор (пакет документов), по которому планируется аванс' })
  @IsString()
  packageId: string;

  @ApiProperty({ description: 'Сумма аванса, руб.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;
}
