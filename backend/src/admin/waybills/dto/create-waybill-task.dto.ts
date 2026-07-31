import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateWaybillTaskDto {
  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  timeFrom?: string | null;

  @ApiPropertyOptional({ example: '16:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  timeTo?: string | null;

  @ApiPropertyOptional({ example: 'двери' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  direction?: string | null;

  @ApiProperty({ example: '1 мет — склад Стройком. Проверить дверь, подписать накладную.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  taskText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  customerInfoText?: string | null;

  @ApiPropertyOptional({ example: 'Иванов Иван Иванович' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerName?: string | null;

  @ApiPropertyOptional({ example: 'г. Калуга, ул. Ленина, 1' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customerAddress?: string | null;

  @ApiPropertyOptional({ example: '+7(900)-000-00-00' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerPhone?: string | null;

  @ApiPropertyOptional({
    type: [String],
    example: ['+7(900)-000-00-00', '+7(900)-111-22-33'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  customerPhones?: string[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  deliveryCost?: number | null;

  @ApiPropertyOptional({ example: 'Заказчик' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  deliveryPayer?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  moversCost?: number | null;

  @ApiPropertyOptional({ example: 'Заказчик' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  moversPayer?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibleUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverUserId?: string | null;
}
