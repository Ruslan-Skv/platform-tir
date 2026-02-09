import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateHomeSectionsDto {
  @ApiPropertyOptional({ description: 'Показывать блок «Первый блок»' })
  @IsOptional()
  @IsBoolean()
  heroVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Наши направления»' })
  @IsOptional()
  @IsBoolean()
  directionsVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Почему выбирают нас»' })
  @IsOptional()
  @IsBoolean()
  advantagesVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Комплексные решения»' })
  @IsOptional()
  @IsBoolean()
  servicesVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Популярные товары»' })
  @IsOptional()
  @IsBoolean()
  featuredProductsVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Контактная форма»' })
  @IsOptional()
  @IsBoolean()
  contactFormVisible?: boolean;
}
