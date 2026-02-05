import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsBoolean, IsOptional, ValidateIf } from 'class-validator';

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

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v != null && v !== '')
  @IsString()
  @MaxLength(50)
  category?: string | null;
}
