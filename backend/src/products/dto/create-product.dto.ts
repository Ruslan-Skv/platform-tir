import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  ArrayMaxSize,
  ArrayUnique,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCardVariantDto } from './product-card-variant.dto';

export class CreateProductDto {
  @ApiProperty({ example: 'Дверь входная металлическая' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'dver-vhodnaya-metallicheskaya' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'Описание товара', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'SKU-001', required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 15000.0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 18000.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  comparePrice?: number;

  @ApiProperty({ example: 10, default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stock?: number;

  @ApiProperty({
    example: 25.5,
    required: false,
    description: 'Масса товара, кг',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @ApiProperty({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @ApiProperty({
    example: false,
    default: false,
    description: 'Товар партнёра (устарело, используется partnerId)',
  })
  @IsOptional()
  @IsBoolean()
  isPartnerProduct?: boolean;

  @ApiProperty({
    example: 'partner-id',
    required: false,
    description: 'ID партнёра (если указан — товар считается товаром партнёра)',
  })
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiProperty({ example: 0, default: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;

  @ApiProperty({ example: 'category-id' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    example: 'manufacturer-cuid',
    required: false,
    description: 'Производитель из справочника (Настройки → Производители)',
  })
  @IsOptional()
  @IsString()
  manufacturerId?: string;

  @ApiProperty({ example: ['/images/product1.jpg'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    example: 'https://www.youtube.com/watch?v=...',
    required: false,
    description: 'URL видеоролика о товаре (YouTube, Vimeo или свой хостинг)',
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  attributes?: Record<string, string | number | boolean | string[]>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiProperty({ example: ['60x200', '70x200', '80x200'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @ApiProperty({ example: ['правое', 'левое'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  openingSide?: string[];

  @ApiProperty({ example: 'supplier-id', required: false })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({
    example: 'SUP-ART-8821',
    required: false,
    description: 'Артикул товара у поставщика',
  })
  @IsOptional()
  @IsString()
  supplierSku?: string;

  @ApiProperty({ example: 'https://supplier.com/product/123', required: false })
  @IsOptional()
  @IsString()
  supplierProductUrl?: string;

  @ApiProperty({ example: 12000.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  supplierPrice?: number;

  /** Схожие товары в одной карточке (до 5): цена, размер, фото, наименование, цвет, доп. опция */
  @ApiProperty({ type: [ProductCardVariantDto], required: false, maxItems: 5 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @Type(() => ProductCardVariantDto)
  cardVariants?: ProductCardVariantDto[];

  @ApiProperty({
    description: 'ID бэйджей карточки (слева от фото), из справочника; не более 5',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  catalogBadgeIds?: string[];
}
