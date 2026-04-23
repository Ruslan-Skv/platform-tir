import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh-токен, выданный при входе' })
  @IsString()
  @MinLength(32)
  refresh_token!: string;
}
