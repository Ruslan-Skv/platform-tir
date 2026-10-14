import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export const CEILINGS_PRICE_CATEGORIES = [
  'FABRIC',
  'TAPE',
  'PROFILE',
  'FABRIC_EXTRA',
  'GOODS',
] as const;

export type CeilingsPriceCategory = (typeof CEILINGS_PRICE_CATEGORIES)[number];

export class CeilingsPriceListSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  fabricMarkup?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  profileMarkup?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tapeMarkup?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultExtraMarkupPercent?: number;

  /** Наценки по блокам товара: { "Гардины": 1.8, ... } */
  @IsOptional()
  @IsObject()
  goodsGroupMarkups?: Record<string, number>;
}

export class CeilingsPriceItemDto {
  @IsString()
  id!: string;

  @IsIn(CEILINGS_PRICE_CATEGORIES)
  category!: CeilingsPriceCategory;

  @IsString()
  name!: string;

  @IsString()
  unit!: string;

  @IsNumber()
  purchasePrice!: number;

  @IsOptional()
  @IsNumber()
  markup?: number | null;

  @IsNumber()
  retailPrice!: number;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsBoolean()
  active!: boolean;

  @IsNumber()
  sortOrder!: number;
}

export class SetCeilingsPriceListDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CeilingsPriceListSettingsDto)
  settings?: CeilingsPriceListSettingsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CeilingsPriceItemDto)
  items!: CeilingsPriceItemDto[];
}
