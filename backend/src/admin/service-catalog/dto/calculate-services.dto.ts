import { IsArray, IsOptional, IsString, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ServiceLineItemDto {
  @IsString()
  itemId: string;

  @IsNumber()
  @Min(0.001, { message: 'Количество должно быть больше 0' })
  @Type(() => Number)
  quantity: number;
}

export class CalculateServicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceLineItemDto)
  items: { itemId: string; quantity: number }[];

  @IsString()
  @IsOptional()
  objectId?: string; // ID объекта (ComplexObject) для привязки расчёта
}
