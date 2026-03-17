import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, ValidateIf } from 'class-validator';

export class UpdateDirectorMessageBlockDto {
  @ApiPropertyOptional({
    example: 'director@company.ru',
    description: 'Email директора, на который будут приходить письма из формы',
  })
  @IsOptional()
  @ValidateIf((o) => o.directorEmail !== '' && o.directorEmail != null)
  @IsEmail()
  directorEmail?: string | null;
}
