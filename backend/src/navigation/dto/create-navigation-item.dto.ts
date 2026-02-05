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

  @ApiPropertyOptional({
    description: 'Категория для выпадающего меню: products, services, promotions, blog, photo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}
