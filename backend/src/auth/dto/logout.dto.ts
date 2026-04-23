import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ description: 'Refresh-токен текущей сессии (будет отозван)' })
  @IsString()
  @MinLength(32)
  refresh_token!: string;
}
