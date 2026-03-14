import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Токен из ссылки в письме' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewPassword123!', description: 'Новый пароль', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  newPassword: string;
}
