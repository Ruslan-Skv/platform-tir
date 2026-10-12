import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { CalculateSalaryDto } from './dto/calculate-salary.dto';
import { SalaryMyService } from './services/salary-my.service';

/**
 * «Моя з/п»: личный расчёт текущего сотрудника за период. Доступ к разделу выдаёт
 * суперадмин (ресурс admin.accounting.salary.my); эндпоинт считает строго для
 * пользователя из JWT и чужих данных не отдаёт.
 */
@Controller('admin/salary/my')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
export class SalaryMyController {
  constructor(private readonly mySalary: SalaryMyService) {}

  @Get()
  findMy(@Query() query: CalculateSalaryDto, @Req() req: RequestWithUser) {
    return this.mySalary.calculateMy(req.user.id, query);
  }
}
