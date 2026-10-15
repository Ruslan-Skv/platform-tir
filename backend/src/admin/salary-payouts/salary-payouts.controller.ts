import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { QuerySalaryPayoutsDto } from './dto/query-salary-payouts.dto';
import { CreateSalaryPayoutDto } from './dto/create-salary-payout.dto';
import { UpdateSalaryPayoutDto } from './dto/update-salary-payout.dto';
import { SalaryPayoutsService } from './salary-payouts.service';

/**
 * Роли на классе — «широкий фильтр» как у кассы; фактический доступ к разделу
 * решает AdminResourceInterceptor по ресурсу admin.accounting.payouts.
 */
const PAYOUTS_SECTION_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'TECHNOLOGIST',
  'MANAGER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

@Controller('admin/salary-payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PAYOUTS_SECTION_ROLES)
export class SalaryPayoutsController {
  constructor(private readonly salaryPayouts: SalaryPayoutsService) {}

  /** Журнал выплат з/п: записи раздела + ручные записи ДП с основанием «Зар/плата». */
  @Get()
  findAll(@Query() query: QuerySalaryPayoutsDto) {
    return this.salaryPayouts.findAll({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      method: query.method,
      source: query.source,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  /** Выплата з/п: наличная попадает в кассу, безналичная — в раздел «Банк». */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSalaryPayoutDto, @Req() req: RequestWithUser) {
    return this.salaryPayouts.create(dto, req.user?.id);
  }

  /** Правка выплаты — только супер-админ (исправление ошибок). */
  @Patch(':id')
  @Roles('SUPER_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateSalaryPayoutDto) {
    return this.salaryPayouts.update(id, dto);
  }

  /** Удаление ошибочной выплаты (мягкое) — только супер-админ. */
  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.salaryPayouts.remove(id);
  }
}
