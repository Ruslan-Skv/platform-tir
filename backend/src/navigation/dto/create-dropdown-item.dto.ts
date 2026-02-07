import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateDropdownItemDto {
  @ApiProperty({ description: 'Название пункта выпадающего меню' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Ссылка', default: '#' })
  @IsString()
  @MaxLength(500)
  href: string;

  @ApiPropertyOptional({ description: 'Иконка (класс или URL)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  icon?: string | null;
}
