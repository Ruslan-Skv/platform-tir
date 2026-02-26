import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateServiceOrderCustomerDto {
  @ApiPropertyOptional({ description: 'Email покупателя' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

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
}
