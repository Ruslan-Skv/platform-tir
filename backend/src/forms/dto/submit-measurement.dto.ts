import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConsentAcceptedDto } from '../../common/dto/consent-accepted.dto';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class SubmitMeasurementDto extends ConsentAcceptedDto {
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
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

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

  @ApiPropertyOptional({
    description: 'Предпочтительное время (устарело, оставлено для совместимости)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredTime?: string;

  @ApiPropertyOptional({ description: 'Интересующий товар' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  productType?: string;

  @ApiPropertyOptional({ description: 'Комментарий' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;
}
