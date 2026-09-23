import { IsString, IsOptional, IsNumber, IsBoolean, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceCatalogWorkGroup } from '@prisma/client';

export class UpdateServiceCatalogItemDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0, { message: 'Цена не может быть отрицательной' })
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  /// null — сбросить группу работ
  @IsEnum(ServiceCatalogWorkGroup)
  @IsOptional()
  workGroup?: ServiceCatalogWorkGroup | null;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
