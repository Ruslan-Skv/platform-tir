import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class ResolvePublicOffersDto {
  @ApiPropertyOptional({ type: [String], description: 'ID категорий товаров в корзине' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productCategoryIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'ID категорий услуг в корзине' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceCategoryIds?: string[];

  @ApiPropertyOptional({ description: 'В корзине есть товары' })
  @IsOptional()
  @IsBoolean()
  hasProducts?: boolean;

  @ApiPropertyOptional({ description: 'В корзине есть услуги' })
  @IsOptional()
  @IsBoolean()
  hasServices?: boolean;

  @ApiPropertyOptional({ description: 'ID заказа (для оформления после проверки)' })
  @IsOptional()
  @IsString()
  orderId?: string;
}
