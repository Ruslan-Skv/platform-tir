import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateHomeSectionsDto {
  @ApiPropertyOptional({ description: 'Показывать блок «Первый блок» на десктопе' })
  @IsOptional()
  @IsBoolean()
  heroVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Первый блок» на мобильных' })
  @IsOptional()
  @IsBoolean()
  heroMobileVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Наши направления» на десктопе' })
  @IsOptional()
  @IsBoolean()
  directionsVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Наши направления» на мобильных' })
  @IsOptional()
  @IsBoolean()
  directionsMobileVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Почему выбирают нас» на десктопе' })
  @IsOptional()
  @IsBoolean()
  advantagesVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Почему выбирают нас» на мобильных' })
  @IsOptional()
  @IsBoolean()
  advantagesMobileVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Комплексные решения» на десктопе' })
  @IsOptional()
  @IsBoolean()
  servicesVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Комплексные решения» на мобильных' })
  @IsOptional()
  @IsBoolean()
  servicesMobileVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Популярные товары» на десктопе' })
  @IsOptional()
  @IsBoolean()
  featuredProductsVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Популярные товары» на мобильных' })
  @IsOptional()
  @IsBoolean()
  featuredProductsMobileVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Контактная форма» на десктопе' })
  @IsOptional()
  @IsBoolean()
  contactFormVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать блок «Контактная форма» на мобильных' })
  @IsOptional()
  @IsBoolean()
  contactFormMobileVisible?: boolean;
}
