import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class YandexCallbackDto {
  @ApiProperty({ description: 'Код авторизации из redirect URL Яндекса' })
  @IsString()
  @IsNotEmpty({ message: 'Код авторизации отсутствует' })
  code: string;

  @ApiProperty({ description: 'state из URL авторизации (защита от login CSRF)', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  state?: string;
}
