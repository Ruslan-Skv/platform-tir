import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DeliveryAddressDto {
  @ApiProperty({ description: 'Улица, дом, квартира' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  street: string;

  @ApiProperty({ description: 'Город' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  city: string;

  @ApiPropertyOptional({ description: 'Индекс' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Регион/область' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  region?: string;

  @ApiPropertyOptional({ description: 'Страна', default: 'RU' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ description: 'Имя получателя' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Фамилия получателя' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Телефон получателя' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
