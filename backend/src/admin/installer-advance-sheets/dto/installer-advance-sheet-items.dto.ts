import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

/**
 * Строка ведомости: аванс по договору (packageId) либо выдача денег без
 * привязки к договору — тогда обязателен purpose («Назначение выдачи»).
 */
export class CreateInstallerAdvanceSheetItemDto {
  @ApiPropertyOptional({
    description: 'Договор (пакет документов); null — выдача без привязки к договору',
  })
  @ValidateIf((o) => !o.purpose)
  @IsString()
  packageId?: string;

  @ApiPropertyOptional({
    description: 'Назначение выдачи для строки без договора (обязательно, если packageId не задан)',
  })
  @ValidateIf((o) => !o.packageId)
  @IsString()
  @MaxLength(500)
  purpose?: string;

  @ApiProperty({ description: 'Сумма аванса, руб.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;
}
