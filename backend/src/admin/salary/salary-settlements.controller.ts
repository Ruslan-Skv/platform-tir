import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { SalaryCalculationService } from './salary-calculation.service';
import { SalarySettlementsService } from './salary-settlements.service';
import { CalculateSalaryDto, CreateSalarySettlementDto } from './dto/calculate-salary.dto';

/**
 * Расчёт з/п за период и зафиксированные ведомости.
 */
const SALARY_SECTION_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

@Controller('admin/salary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SALARY_SECTION_ROLES)
export class SalarySettlementsController {
  constructor(
    private readonly calculation: SalaryCalculationService,
    private readonly settlements: SalarySettlementsService,
  ) {}

  /** Живой расчёт за период (без сохранения). */
  @Get('calculate')
  calculate(@Query() query: CalculateSalaryDto) {
    return this.calculation.calculate(query);
  }

  /** Список зафиксированных расчётов. */
  @Get('settlements')
  listSettlements() {
    return this.settlements.findAll();
  }

  /** Зафиксировать расчёт за период (снимок). */
  @Post('settlements')
  @HttpCode(HttpStatus.CREATED)
  @Roles('SUPER_ADMIN', 'ADMIN')
  createSettlement(@Body() dto: CreateSalarySettlementDto, @Req() req: RequestWithUser) {
    return this.settlements.create(dto, req.user?.id);
  }

  @Get('settlements/:id')
  getSettlement(@Param('id') id: string) {
    return this.settlements.findOne(id);
  }

  /** Подтвердить расчёт. */
  @Put('settlements/:id/confirm')
  @Roles('SUPER_ADMIN', 'ADMIN')
  confirmSettlement(@Param('id') id: string) {
    return this.settlements.confirm(id);
  }

  @Delete('settlements/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  removeSettlement(@Param('id') id: string) {
    return this.settlements.remove(id);
  }
}
