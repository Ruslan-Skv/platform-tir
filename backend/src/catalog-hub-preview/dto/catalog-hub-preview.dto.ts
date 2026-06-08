import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CatalogHubPreviewSectionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  featuredProductIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  newProductIds?: string[];
}

export class UpdateCatalogHubPreviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  productsPerGroup?: number;

  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => CatalogHubPreviewSectionDto)
  sections!: CatalogHubPreviewSectionDto[];
}

export class CatalogHubPreviewModeQuery {
  @IsOptional()
  @IsIn(['featured', 'new'])
  mode?: 'featured' | 'new';
}
