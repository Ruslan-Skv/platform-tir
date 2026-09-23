import { IsString, IsOptional, IsNumber, IsBoolean, MinLength, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceCatalogWorkGroup } from '@prisma/client';

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

  @IsEnum(ServiceCatalogWorkGroup)
  @IsOptional()
  workGroup?: ServiceCatalogWorkGroup; // Демонтажные / черновые / чистовые работы

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
