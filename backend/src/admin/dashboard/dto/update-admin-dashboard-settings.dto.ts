import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ADMIN_DASHBOARD_SECTION_IDS,
  type AdminDashboardSectionId,
} from '../admin-dashboard-section-order';

export class AdminDashboardQuickLinkDto {
  @ApiProperty({ example: 'Заказы' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label!: string;

  @ApiProperty({ example: '/admin/orders' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(/^\/(?!\/)/, { message: 'Ссылка должна начинаться с / и вести внутри приложения' })
  href!: string;

  @ApiPropertyOptional({ description: 'Показывать ссылку на дашборде', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateAdminDashboardSettingsDto {
  @ApiPropertyOptional({ description: 'Показывать статистику добавления товаров в каталог' })
  @IsOptional()
  @IsBoolean()
  catalogActivityVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать график динамики обучения сотрудников' })
  @IsOptional()
  @IsBoolean()
  trainingDynamicsVisible?: boolean;

  @ApiPropertyOptional({ description: 'Показывать календарь событий на дашборде' })
  @IsOptional()
  @IsBoolean()
  calendarVisible?: boolean;

  @ApiPropertyOptional({
    description: 'Показывать блок выбора периода (даты «с» / «по» и быстрые пресеты)',
  })
  @IsOptional()
  @IsBoolean()
  dateToolbarVisible?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Порядок секций на дашборде',
    example: ['trainingDynamics', 'catalogActivity', 'calendar', 'quickLinks'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ADMIN_DASHBOARD_SECTION_IDS.length)
  @IsString({ each: true })
  @IsIn(ADMIN_DASHBOARD_SECTION_IDS, { each: true })
  sectionOrder?: AdminDashboardSectionId[];

  @ApiPropertyOptional({
    type: [AdminDashboardQuickLinkDto],
    description: 'Быстрые ссылки на дашборде (полная замена списка)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AdminDashboardQuickLinkDto)
  quickLinks?: AdminDashboardQuickLinkDto[];
}
