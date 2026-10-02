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
import { BankEntriesService } from './bank-entries.service';
import { QueryBankEntriesDto } from './dto/query-bank-entries.dto';
import { CreateBankEntryDto, UpdateBankEntryDto } from './dto/create-bank-entry.dto';

/**
 * Роли на классе — «широкий фильтр» как у остальных разделов; фактический доступ
 * к разделу решает AdminResourceInterceptor по ресурсу admin.accounting.bank.
 */
const BANK_SECTION_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'TECHNOLOGIST',
  'MANAGER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

@Controller('admin/bank-entries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...BANK_SECTION_ROLES)
export class BankEntriesController {
  constructor(private readonly bankEntries: BankEntriesService) {}

  /** Список поступлений банка за период с итогами по банкам. */
  @Get()
  findAll(@Query() query: QueryBankEntriesDto) {
    return this.bankEntries.findAll({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      bank: query.bank,
      entryType: query.entryType,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  /** Внесение поступления по банковской выписке. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBankEntryDto, @Req() req: RequestWithUser) {
    return this.bankEntries.create(dto, req.user?.id);
  }

  /** Исправление ошибок ввода (супер-админ и роли с EDIT по ресурсу). */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBankEntryDto) {
    return this.bankEntries.update(id, dto);
  }

  /** Удаление ошибочной записи — только супер-админ. */
  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.bankEntries.remove(id);
  }
}
