import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SalarySettingsService } from './salary-settings.service';
import { SaveSalaryGlobalSettingsDto } from './dto/save-salary-global-settings.dto';
import {
  CreateSalaryCategoryDto,
  UpdateSalaryCategoryDto,
  UpsertSalaryRateRuleDto,
} from './dto/salary-category.dto';

/**
 * Настройки расчёта з/п. Просмотр — роли раздела, изменение — только суперадмин
 * (проценты, сплиты, налог и направления — установочные данные).
 */
const SALARY_SECTION_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

@Controller('admin/salary/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SALARY_SECTION_ROLES)
export class SalarySettingsController {
  constructor(private readonly settings: SalarySettingsService) {}

  @Get()
  getSettings() {
    return this.settings.getSettings();
  }

  @Put('global')
  @Roles('SUPER_ADMIN')
  saveGlobal(@Body() dto: SaveSalaryGlobalSettingsDto) {
    return this.settings.saveGlobalSettings(dto);
  }

  @Post('categories')
  @Roles('SUPER_ADMIN')
  createCategory(@Body() dto: CreateSalaryCategoryDto) {
    return this.settings.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles('SUPER_ADMIN')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateSalaryCategoryDto) {
    return this.settings.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Roles('SUPER_ADMIN')
  removeCategory(@Param('id') id: string) {
    return this.settings.removeCategory(id);
  }

  @Put('categories/:id/rate-rules')
  @Roles('SUPER_ADMIN')
  upsertRateRule(@Param('id') id: string, @Body() dto: UpsertSalaryRateRuleDto) {
    return this.settings.upsertRateRule(id, dto);
  }

  @Delete('categories/:id/rate-rules/:ruleId')
  @Roles('SUPER_ADMIN')
  removeRateRule(@Param('id') id: string, @Param('ruleId') ruleId: string) {
    return this.settings.removeRateRule(id, ruleId);
  }
}
