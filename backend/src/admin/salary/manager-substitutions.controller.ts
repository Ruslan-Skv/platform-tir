import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestWithUser } from '../../common/types/request-with-user.types';
import {
  CreateManagerSubstitutionDto,
  UpdateManagerSubstitutionDto,
} from './dto/manager-substitution.dto';
import { ManagerSubstitutionsService } from './services/manager-substitutions.service';

/** Роли раздела «ЗП» (как у настроек расчёта). */
const SALARY_SECTION_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

/** Подмены менеджеров видны всем ролям CRM: баннер в «Оплаты и Управление
 *  договором» показывает, кто сейчас отвечает за договор отсутствующего. */
const CRM_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
] as const;

/**
 * Подмены менеджеров (отпуск/длительный больничный). Просмотр — роли раздела
 * ЗП и CRM (баннер в хабе договора), создание/изменение — только супер-админ,
 * чтобы режим включался осознанно и не возникало случайных накладок.
 */
@Controller('admin/salary/manager-substitutions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SALARY_SECTION_ROLES)
export class ManagerSubstitutionsController {
  constructor(private readonly substitutions: ManagerSubstitutionsService) {}

  @Get()
  list() {
    return this.substitutions.list();
  }

  @Get('active')
  @Roles(...CRM_ROLES)
  listActive(@Query('managerId') managerId: string) {
    return this.substitutions.listActiveForManager(managerId);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  create(@Body() dto: CreateManagerSubstitutionDto, @Req() req: RequestWithUser) {
    return this.substitutions.create(dto, req.user?.id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateManagerSubstitutionDto) {
    return this.substitutions.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.substitutions.remove(id);
  }
}
