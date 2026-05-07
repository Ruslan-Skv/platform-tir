import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { INSTALLER_DIRECTIONS } from '../installer-directions.constant';

export class CreateInstallerDto {
  @ApiProperty({ enum: INSTALLER_DIRECTIONS })
  @IsString()
  @IsIn(INSTALLER_DIRECTIONS)
  direction: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  grade: string;
}
