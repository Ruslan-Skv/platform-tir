import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum AdminResourcePermissionLevel {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  /** Явный запрет доступа (перекрывает доступ по роли) */
  DENIED = 'DENIED',
}

export class SetPermissionDto {
  @ApiProperty({ description: 'ID пользователя' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: AdminResourcePermissionLevel })
  @IsEnum(AdminResourcePermissionLevel)
  permission: AdminResourcePermissionLevel;
}
