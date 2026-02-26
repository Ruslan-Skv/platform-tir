import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateServiceOrderItemDto {
  @ApiProperty({ description: 'ID вида работ (ServiceCatalogItem)' })
  @IsString()
  itemId: string;

  @ApiProperty({ description: 'Количество' })
  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class CreateServiceOrderDto {
  @ApiProperty({ description: 'Email покупателя' })
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

  @ApiPropertyOptional({ description: 'Комментарий покупателя' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiProperty({
    type: [CreateServiceOrderItemDto],
    description: 'Позиции заказа (результат расчёта)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderItemDto)
  items: CreateServiceOrderItemDto[];
}
