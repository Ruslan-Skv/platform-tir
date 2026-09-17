import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MoneyMovementsService } from './money-movements.service';
import { QueryMoneyMovementsDto } from './dto/query-money-movements.dto';

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

@Controller('admin/money-movements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class MoneyMovementsController {
  constructor(private readonly moneyMovementsService: MoneyMovementsService) {}

  @Get()
  findAll(@Query() query: QueryMoneyMovementsDto) {
    return this.moneyMovementsService.findAll({
      managerId: query.managerId,
      direction: query.direction,
      paymentForm: query.paymentForm,
      paymentType: query.paymentType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }
}
