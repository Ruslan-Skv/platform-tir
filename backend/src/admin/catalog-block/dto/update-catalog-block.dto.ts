import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateCatalogBlockDto {
  @ApiPropertyOptional({
    description: 'Кол-во карточек в строке в каталоге на мобильном по умолчанию',
    enum: [1, 2],
  })
  @IsOptional()
  @IsIn([1, 2])
  defaultMobileCatalogColumns?: 1 | 2;
}
