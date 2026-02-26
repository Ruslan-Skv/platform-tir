import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
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

export class SubmitFromCartForCustomerDto {
  @ApiProperty({ description: 'Email покупателя (заказ будет привязан к этому email)' })
  @IsEmail()
  customerEmail: string;

  @ApiPropertyOptional({ description: 'Имя покупателя' })
  @IsOptional()
  @IsString()
  customerFirstName?: string;

  @ApiPropertyOptional({ description: 'Фамилия покупателя' })
  @IsOptional()
  @IsString()
  customerLastName?: string;

  @ApiPropertyOptional({ description: 'Телефон покупателя' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'ID способа доставки' })
  @IsOptional()
  @IsString()
  shippingMethodId?: string;

  @ApiPropertyOptional({ type: DeliveryAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @ApiPropertyOptional({ enum: DeliveryType })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  deliveryFloor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  deliveryHasElevator?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredDeliveryTime?: string;
}
