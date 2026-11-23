import { IsString, IsOptional, MinLength, IsBoolean, IsInt } from 'class-validator';

export class UpdateCeilingManufacturerDto {
  @IsString()
  @MinLength(1, { message: 'Название производителя обязательно' })
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1, { message: 'Slug обязателен' })
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
