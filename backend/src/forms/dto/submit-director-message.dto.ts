import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConsentAcceptedDto } from '../../common/dto/consent-accepted.dto';

export class SubmitDirectorMessageDto extends ConsentAcceptedDto {
  @ApiProperty({ example: 'Иванов Иван' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+7 (900) 123-45-67' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({
    example: 'complaint',
    description: 'complaint | suggestion | cooperation | question | other',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  subject: string;

  @ApiProperty({ example: 'Текст сообщения...' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
