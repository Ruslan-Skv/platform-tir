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

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { SuppliersService } from './suppliers.service';
import { QuerySuppliersSummaryDto } from './dto/query-suppliers-summary.dto';
import { QuerySupplierLedgerDto } from './dto/query-supplier-ledger.dto';
import { SaveSupplierDto } from './dto/save-supplier.dto';
import { SaveSupplierRequisiteDto } from './dto/save-requisite.dto';
import { SaveSupplierLedgerEntryDto } from './dto/save-ledger-entry.dto';

/**
 * Роли на классе — «широкий фильтр» как у раздела «Касса»; фактический доступ
 * к разделу решает AdminResourceInterceptor по ресурсу admin.suppliers.
 */
const SUPPLIERS_SECTION_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'TECHNOLOGIST',
  'MANAGER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

/** Раздел «Поставщики»: сводка сальдо расчётов, карточка поставщика
 *  (реквизиты + ведомость счетов/оплат). */
@Controller('admin/suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPPLIERS_SECTION_ROLES)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  /** Сводный список поставщиков с сальдо — итоговая вкладка для руководителя. */
  @Get('summary')
  getSummary(@Query() query: QuerySuppliersSummaryDto) {
    return this.suppliers.getSummary(query);
  }

  /** Карточка поставщика: реквизиты + итоги ведомости. */
  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.suppliers.getDetail(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: SaveSupplierDto) {
    return this.suppliers.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: SaveSupplierDto) {
    return this.suppliers.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliers.remove(id);
  }

  /** Ведомость расчётов: счета (начисления) и оплаты поставщика. */
  @Get(':id/ledger')
  getLedger(@Param('id') id: string, @Query() query: QuerySupplierLedgerDto) {
    return this.suppliers.getLedger(id, query);
  }

  @Post(':id/ledger')
  @HttpCode(HttpStatus.CREATED)
  createEntry(
    @Param('id') id: string,
    @Body() dto: SaveSupplierLedgerEntryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.suppliers.createEntry(id, dto, req.user?.id);
  }

  @Patch('ledger/:entryId')
  updateEntry(@Param('entryId') entryId: string, @Body() dto: SaveSupplierLedgerEntryDto) {
    return this.suppliers.updateEntry(entryId, dto);
  }

  @Delete('ledger/:entryId')
  deleteEntry(@Param('entryId') entryId: string) {
    return this.suppliers.deleteEntry(entryId);
  }

  /** Банковские реквизиты поставщика (блоков может быть несколько). */
  @Post(':id/requisites')
  @HttpCode(HttpStatus.CREATED)
  createRequisite(@Param('id') id: string, @Body() dto: SaveSupplierRequisiteDto) {
    return this.suppliers.createRequisite(id, dto);
  }

  @Patch('requisites/:requisiteId')
  updateRequisite(
    @Param('requisiteId') requisiteId: string,
    @Body() dto: SaveSupplierRequisiteDto,
  ) {
    return this.suppliers.updateRequisite(requisiteId, dto);
  }

  @Delete('requisites/:requisiteId')
  deleteRequisite(@Param('requisiteId') requisiteId: string) {
    return this.suppliers.deleteRequisite(requisiteId);
  }
}
