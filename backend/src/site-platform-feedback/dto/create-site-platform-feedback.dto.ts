import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { KnowledgePlatformFeedbackType } from '@prisma/client';
import { ConsentAcceptedDto } from '../../common/dto/consent-accepted.dto';

export class CreateSitePlatformFeedbackDto extends ConsentAcceptedDto {
  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  @MinLength(1, { message: 'Укажите имя' })
  @MaxLength(200)
  senderName!: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Некорректный email' })
  @MaxLength(200)
  senderEmail?: string;

  @ApiPropertyOptional({ example: '+7 (900) 123-45-67' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  senderPhone?: string;

  @IsEnum(KnowledgePlatformFeedbackType, {
    message: 'Укажите тип: предложение или сообщение об ошибке',
  })
  type!: KnowledgePlatformFeedbackType;

  @IsString()
  @MinLength(1, { message: 'Текст не может быть пустым' })
  @MaxLength(4000, { message: 'Текст не должен превышать 4000 символов' })
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'URL страницы слишком длинный' })
  pageUrl?: string;
}
