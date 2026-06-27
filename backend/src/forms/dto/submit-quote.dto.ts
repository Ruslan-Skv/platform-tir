import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConsentAcceptedDto } from '../../common/dto/consent-accepted.dto';

export class SubmitQuoteDto extends ConsentAcceptedDto {
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

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiProperty({ description: 'Вид работ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  serviceType: string;

  @ApiPropertyOptional({ description: 'Адрес или описание объекта' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'Комментарий' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
