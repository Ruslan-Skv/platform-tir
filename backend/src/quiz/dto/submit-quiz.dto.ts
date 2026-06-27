import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ConsentAcceptedDto } from '../../common/dto/consent-accepted.dto';

export class SubmitQuizDto extends ConsentAcceptedDto {
  @ApiProperty({ example: 'Иван' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: '+79113003503' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^(\+7|8)\(\d{3}\)-\d{3}-\d{2}-\d{2}$/, {
    message: 'Некорректный номер телефона',
  })
  phone: string;

  @ApiProperty({ description: 'Ответы по ключам шагов' })
  @IsObject()
  answers: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmMedium?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmCampaign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  landingUrl?: string;
}
