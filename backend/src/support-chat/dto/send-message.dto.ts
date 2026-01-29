import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Здравствуйте, у меня вопрос по заказу' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}
