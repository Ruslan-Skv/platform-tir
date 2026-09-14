import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ADMIN_ROLES } from '../../../common/config/admin-roles.config';

export class AdminDashboardRoleQuickLinkItemDto {
  @ApiProperty({ description: 'Идентификатор быстрой ссылки' })
  @IsString()
  linkId!: string;

  @ApiProperty({ description: 'Доступна ли ссылка роли' })
  @IsBoolean()
  allowed!: boolean;
}

export class UpdateAdminDashboardRoleQuickLinksDto {
  @ApiProperty({ description: 'Админ-роль, для которой настраивается доступность ссылок' })
  @IsString()
  @IsIn(ADMIN_ROLES.filter((role) => role !== 'SUPER_ADMIN'), {
    message: 'Недопустимая роль (для SUPER_ADMIN доступны все ссылки)',
  })
  role!: string;

  @ApiPropertyOptional({
    type: [AdminDashboardRoleQuickLinkItemDto],
    description: 'Доступность отдельных быстрых ссылок для роли',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AdminDashboardRoleQuickLinkItemDto)
  items?: AdminDashboardRoleQuickLinkItemDto[];
}
