import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsBoolean, IsOptional } from 'class-validator';

export class UpdateNavigationItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  href?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasDropdown?: boolean;

  @ApiPropertyOptional({ description: 'Показывать в меню на сайте' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
