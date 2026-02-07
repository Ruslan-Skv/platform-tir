import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsBoolean, IsOptional } from 'class-validator';

export class CreateNavigationItemDto {
  @ApiProperty({ description: 'Текст кнопки меню' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Ссылка', default: '#' })
  @IsString()
  @MaxLength(500)
  href: string;

  @ApiPropertyOptional({ description: 'Есть ли выпадающее меню', default: false })
  @IsOptional()
  @IsBoolean()
  hasDropdown?: boolean;

  @ApiPropertyOptional({ description: 'Показывать в меню на сайте', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
