import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum DeliveryType {
  TO_ENTRANCE = 'TO_ENTRANCE',
  TO_APARTMENT = 'TO_APARTMENT',
}

export class CalculateDeliveryDto {
  @ApiProperty({ description: 'Сумма заказа (сумма товаров), руб' })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ description: 'Город доставки (для определения Мурманск / за городом)' })
  @IsString()
  city: string;

  @ApiPropertyOptional({
    description: 'Расстояние от Мурманска, км (при доставке за пределами города)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @ApiProperty({ enum: DeliveryType, description: 'До подъезда или подъём в квартиру' })
  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @ApiPropertyOptional({ description: 'Этаж (обязателен при подъёме в квартиру)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  deliveryFloor?: number;

  @ApiPropertyOptional({ description: 'Есть лифт (при подъёме в квартиру)' })
  @IsOptional()
  @IsBoolean()
  deliveryHasElevator?: boolean;
}
