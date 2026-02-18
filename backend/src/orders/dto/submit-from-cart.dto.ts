import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryAddressDto } from './delivery-address.dto';
import { DeliveryType } from './calculate-delivery.dto';

export class SubmitFromCartDto {
  @ApiPropertyOptional({ description: 'ID способа доставки (устаревший вариант)' })
  @IsOptional()
  @IsString()
  shippingMethodId?: string;

  /** Адрес доставки (при оформлении доставки через форму) */
  @ApiPropertyOptional({ type: DeliveryAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @ApiPropertyOptional({ enum: DeliveryType, description: 'До подъезда или подъём в квартиру' })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({ description: 'Этаж (при подъёме в квартиру)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  deliveryFloor?: number;

  @ApiPropertyOptional({ description: 'Есть лифт (при подъёме в квартиру)' })
  @IsOptional()
  @IsBoolean()
  deliveryHasElevator?: boolean;

  @ApiPropertyOptional({
    description: 'Расстояние от Мурманска, км (при доставке за пределами города)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @ApiPropertyOptional({
    description: 'Когда покупателю удобно принять заказ (произвольный текст)',
  })
  @IsOptional()
  @IsString()
  preferredDeliveryTime?: string;
}
