import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { AdminResourcePermissionLevel } from '../../../common/types/admin-resource-permission-level';

export { AdminResourcePermissionLevel };

export class SetPermissionDto {
  @ApiProperty({ description: 'ID пользователя' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: AdminResourcePermissionLevel })
  @IsEnum(AdminResourcePermissionLevel)
  permission: AdminResourcePermissionLevel;
}

export class SetRolePermissionDto {
  @ApiProperty({ description: 'Роль (SUPER_ADMIN, ADMIN, CONTENT_MANAGER и т.д.)' })
  @IsString()
  role: string;

  @ApiProperty({ enum: AdminResourcePermissionLevel })
  @IsEnum(AdminResourcePermissionLevel)
  permission: AdminResourcePermissionLevel;
}
