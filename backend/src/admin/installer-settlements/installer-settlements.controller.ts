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

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { ContractDocumentPackageInstallerAdvancesService } from '../contract-document-packages/payments/contract-document-package-installer-advances.service';
import { CreateInstallerSettlementAdvanceDto } from './dto/create-installer-settlement-advance.dto';
import { QueryInstallerSettlementPackagesDto } from './dto/query-installer-settlement-packages.dto';
import { QueryInstallerSettlementsDto } from './dto/query-installer-settlements.dto';
import { InstallerSettlementsService } from './installer-settlements.service';

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
 * «Расчёт мастеров» — журнал выплат зарплат (авансов) монтажникам и сводка
 * «начислено / выплачено / остаток» по каждому мастеру. Проводки живут в той же
 * таблице, что и авансы модалки «Заказ-наряды» договора: выдача из раздела и
 * из модалки — одни и те же записи (синхронизация общим хранилищем).
 */
@Controller('admin/installer-settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class InstallerSettlementsController {
  constructor(
    private readonly installerSettlementsService: InstallerSettlementsService,
    private readonly installerAdvances: ContractDocumentPackageInstallerAdvancesService,
  ) {}

  @Get()
  findAll(@Query() query: QueryInstallerSettlementsDto) {
    return this.installerSettlementsService.findAll({
      installerId: query.installerId,
      direction: query.direction,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Поиск договора для формы выдачи аванса (№ договора / заказчик) — только
   * супер-админ, как и сама выдача.
   */
  @Get('packages')
  @Roles('SUPER_ADMIN')
  searchPackages(@Query() query: QueryInstallerSettlementPackagesDto) {
    return this.installerSettlementsService.searchPackages({
      search: query.search,
      limit: query.limit,
    });
  }

  /**
   * Выдать аванс мастеру прямо из раздела — та же запись, что в модалке
   * «Заказ-наряды» договора (журнал авансов и остатки там пересчитаются сами).
   * Только супер-админ; роль на методе перекрывает список CRM_ROLES класса.
   */
  @Post('advances')
  @HttpCode(HttpStatus.CREATED)
  @Roles('SUPER_ADMIN')
  createAdvance(@Body() dto: CreateInstallerSettlementAdvanceDto, @Req() req: RequestWithUser) {
    return this.installerAdvances.create(dto.packageId, dto, req.user?.id);
  }
}
