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
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { CreateInstallerAdvanceSheetDto } from './dto/create-installer-advance-sheet.dto';
import { CreateInstallerAdvanceSheetItemCommentDto } from './dto/create-installer-advance-sheet-item-comment.dto';
import { PayInstallerAdvanceSheetDto } from './dto/pay-installer-advance-sheet.dto';
import { QueryInstallerAdvanceSheetPackageBalanceDto } from './dto/query-installer-advance-sheet-package-balance.dto';
import { QueryInstallerAdvanceSheetsDto } from './dto/query-installer-advance-sheets.dto';
import { UpdateInstallerAdvanceSheetDto } from './dto/update-installer-advance-sheet.dto';
import { InstallerAdvanceSheetsService } from './installer-advance-sheets.service';

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

/** Ведомости создаёт ведущий специалист / бригадир (супер-админ — всегда может). */
const SHEET_AUTHOR_ROLES = [
  'SUPER_ADMIN',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

/**
 * «Расчётники мастеров» — ведомости еженедельных авансов (части з/п) мастеров:
 * ведущий специалист / бригадир собирает список «договор → сумма», супер-админ
 * отмечает выплаты (построчно или всей ведомостью). Каждая отметка создаёт
 * запись журнала авансов (ContractDocumentPackageInstallerAdvance) — она видна
 * в модалке «Заказ-наряды» договора и в разделе «Расчёт мастеров».
 */
@Controller('admin/installer-advance-sheets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class InstallerAdvanceSheetsController {
  constructor(private readonly installerAdvanceSheets: InstallerAdvanceSheetsService) {}

  @Get()
  findAll(@Query() query: QueryInstallerAdvanceSheetsDto) {
    return this.installerAdvanceSheets.findAll({
      status: query.status,
      installerId: query.installerId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(...SHEET_AUTHOR_ROLES)
  create(@Body() dto: CreateInstallerAdvanceSheetDto, @Req() req: RequestWithUser) {
    return this.installerAdvanceSheets.create(dto, req.user?.id);
  }

  /**
   * Остаток з/п мастера по договору для формы ведомости: до @Get(':id'),
   * чтобы не перехватывался параметром id.
   */
  @Get('package-balance')
  getPackageBalance(@Query() query: QueryInstallerAdvanceSheetPackageBalanceDto) {
    return this.installerAdvanceSheets.getPackageInstallerBalance(
      query.packageId,
      query.installerId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.installerAdvanceSheets.findOne(id);
  }

  @Patch(':id')
  @Roles(...SHEET_AUTHOR_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateInstallerAdvanceSheetDto) {
    return this.installerAdvanceSheets.update(id, dto);
  }

  @Delete(':id')
  @Roles(...SHEET_AUTHOR_ROLES)
  remove(@Param('id') id: string) {
    return this.installerAdvanceSheets.remove(id);
  }

  /** Выплатить всю ведомость разом (все невыданные строки одной датой). */
  @Post(':id/pay-all')
  @Roles('SUPER_ADMIN')
  payAll(
    @Param('id') id: string,
    @Body() dto: PayInstallerAdvanceSheetDto,
    @Req() req: RequestWithUser,
  ) {
    return this.installerAdvanceSheets.payAll(id, dto, req.user?.id);
  }

  /** Выплатить одну строку ведомости. */
  @Post(':id/items/:itemId/pay')
  @Roles('SUPER_ADMIN')
  payItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PayInstallerAdvanceSheetDto,
    @Req() req: RequestWithUser,
  ) {
    return this.installerAdvanceSheets.payItem(id, itemId, dto, req.user?.id);
  }

  /** Отменить выплату строки: запись уйдёт из журнала авансов, строка снова ожидает. */
  @Post(':id/items/:itemId/unpay')
  @Roles('SUPER_ADMIN')
  unpayItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.installerAdvanceSheets.unpayItem(id, itemId);
  }

  /** Комментарий в переписке по строке; вопрос супер-админа открывает статус QUESTION. */
  @Post(':id/items/:itemId/comments')
  @Roles(...SHEET_AUTHOR_ROLES)
  addComment(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreateInstallerAdvanceSheetItemCommentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.installerAdvanceSheets.addComment(id, itemId, dto.body, req.user);
  }

  /** Снять вопрос по строке (строка снова ожидает выплаты). */
  @Post(':id/items/:itemId/resolve-question')
  @Roles('SUPER_ADMIN')
  resolveQuestion(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.installerAdvanceSheets.resolveQuestion(id, itemId);
  }
}
