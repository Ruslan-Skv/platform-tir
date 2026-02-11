import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum AdminResourcePermissionLevel {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
}

export class SetPermissionDto {
  @ApiProperty({ description: 'ID пользователя' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: AdminResourcePermissionLevel })
  @IsEnum(AdminResourcePermissionLevel)
  permission: AdminResourcePermissionLevel;
}
