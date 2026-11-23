import { IsString, IsOptional, MinLength, IsBoolean, IsInt } from 'class-validator';

export class CreateCeilingManufacturerDto {
  @IsString()
  @MinLength(1, { message: 'Название производителя обязательно' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Slug обязателен' })
  slug: string;

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
