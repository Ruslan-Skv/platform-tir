import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitMeasurementDto {
  @ApiProperty({ description: 'Имя' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Телефон' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  @MaxLength(200)
  email: string;

  @ApiProperty({ description: 'Адрес' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string;

  @ApiProperty({ description: 'Предпочтительная дата' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  preferredDate: string;

  @ApiProperty({ description: 'Предпочтительное время' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  preferredTime: string;

  @ApiProperty({ description: 'Тип продукта' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  productType: string;

  @ApiPropertyOptional({ description: 'Комментарий' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;
}
