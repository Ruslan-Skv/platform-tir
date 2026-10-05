import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { CashBookService } from './cash-book.service';
import { QueryCashBookDto } from './dto/query-cash-book.dto';
import { CreateCashBookEntryDto } from './dto/create-cash-book-entry.dto';

/**
 * Роли на классе — «широкий фильтр» как у раздела «Банк»; фактический доступ
 * к разделу решает AdminResourceInterceptor по ресурсу admin.accounting.cash.
 */
const CASH_SECTION_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'TECHNOLOGIST',
  'MANAGER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

@Controller('admin/cash-book')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CASH_SECTION_ROLES)
export class CashBookController {
  constructor(private readonly cashBook: CashBookService) {}

  /** Список записей кассы: свёрнные наличные оплаты ДП за период. */
  @Get()
  findAll(@Query() query: QueryCashBookDto, @Req() req: RequestWithUser) {
    return this.cashBook.findAll({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      managerId: query.managerId,
      search: query.search,
      page: query.page,
      limit: query.limit,
      requesterId: req.user?.id,
    });
  }

  /** Ручная запись в кассе: наличная проводка, сразу сверённая. */
  @Post('entry')
  @HttpCode(HttpStatus.CREATED)
  createEntry(@Body() dto: CreateCashBookEntryDto, @Req() req: RequestWithUser) {
    return this.cashBook.createEntry(dto, req.user?.id);
  }
}
