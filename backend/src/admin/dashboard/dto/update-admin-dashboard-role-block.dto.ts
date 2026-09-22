import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ADMIN_ROLES } from '../../../common/config/admin-roles.config';

export class UpdateAdminDashboardRoleBlockDto {
  @ApiProperty({ description: 'Админ-роль, для которой настраивается доступность блоков' })
  @IsString()
  @IsIn(ADMIN_ROLES.filter((role) => role !== 'SUPER_ADMIN'), {
    message: 'Недопустимая роль (для SUPER_ADMIN доступны все блоки)',
  })
  role!: string;

  @ApiPropertyOptional({ description: 'Доступен ли блок продаж за текущий месяц' })
  @IsOptional()
  @IsBoolean()
  salesMonth?: boolean;

  @ApiPropertyOptional({ description: 'Доступен ли блок динамики обучения' })
  @IsOptional()
  @IsBoolean()
  trainingDynamics?: boolean;

  @ApiPropertyOptional({ description: 'Доступен ли блок статистики товаров' })
  @IsOptional()
  @IsBoolean()
  catalogActivity?: boolean;

  @ApiPropertyOptional({ description: 'Доступен ли блок календаря' })
  @IsOptional()
  @IsBoolean()
  calendar?: boolean;

  @ApiPropertyOptional({ description: 'Доступен ли блок быстрых ссылок' })
  @IsOptional()
  @IsBoolean()
  quickLinks?: boolean;

  @ApiPropertyOptional({ description: 'Доступен ли блок выбора периода' })
  @IsOptional()
  @IsBoolean()
  dateToolbar?: boolean;
}
