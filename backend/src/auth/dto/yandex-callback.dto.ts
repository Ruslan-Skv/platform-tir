import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class YandexCallbackDto {
  @ApiProperty({ description: 'Код авторизации из redirect URL Яндекса' })
  @IsString()
  @IsNotEmpty({ message: 'Код авторизации отсутствует' })
  code: string;
}
