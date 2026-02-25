import { IsString, IsOptional, IsNumber, IsBoolean, MinLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceCatalogItemDto {
  @IsString()
  categoryId: string;

  @IsString()
  @MinLength(1, { message: 'Название обязательно' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0, { message: 'Цена не может быть отрицательной' })
  @Type(() => Number)
  price: number;

  @IsString()
  @IsOptional()
  unit?: string; // м², шт, п.м. и т.д.

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
