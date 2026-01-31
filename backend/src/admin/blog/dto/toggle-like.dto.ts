import { IsString, IsOptional } from 'class-validator';

export class ToggleLikeDto {
  @IsString()
  @IsOptional()
  guestId?: string;
}
