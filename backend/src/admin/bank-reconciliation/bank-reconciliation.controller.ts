import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { BankReconciliationService } from './bank-reconciliation.service';
import {
  CreateReconciliationLinksDto,
  QueryReconciliationDto,
  QueryReconciliationLinksDto,
} from './dto/reconciliation.dto';

/**
 * Сверка «Банк ↔ ДП». Роли на классе — как у раздела «Банк»; фактический доступ
 * решает AdminResourceInterceptor по ресурсу admin.accounting.bank.
 */
const RECONCILIATION_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'TECHNOLOGIST',
  'MANAGER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

@Controller('admin/bank-reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...RECONCILIATION_ROLES)
export class BankReconciliationController {
  constructor(private readonly reconciliation: BankReconciliationService) {}

  /** Сверка за период: поступления, покрытие, авто-предложения, оплаты без поступления. */
  @Get('preview')
  preview(@Query() query: QueryReconciliationDto) {
    return this.reconciliation.preview({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      lagDays: query.lagDays,
    });
  }

  /** История зафиксированных связей за период. */
  @Get('links')
  listLinks(@Query() query: QueryReconciliationLinksDto) {
    return this.reconciliation.listLinks({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit: query.limit,
    });
  }

  /** Зафиксировать связи поступления с оплатами ДП — суммы выбывают из дальнейших сверок. */
  @Post('links')
  createLinks(@Body() dto: CreateReconciliationLinksDto, @Req() req: RequestWithUser) {
    return this.reconciliation.createLinks(dto, req.user?.id);
  }

  /** Снять одну связь (супер-админ): сумма вернётся в будущие сверки. */
  @Delete('links/:linkId')
  @Roles('SUPER_ADMIN')
  removeLink(@Param('linkId') linkId: string) {
    return this.reconciliation.removeLink(linkId);
  }

  /** Снять всю фиксацию с поступления (супер-админ). */
  @Delete('entries/:bankEntryId/links')
  @Roles('SUPER_ADMIN')
  removeAllLinks(@Param('bankEntryId') bankEntryId: string) {
    return this.reconciliation.removeAllLinks(bankEntryId);
  }
}
