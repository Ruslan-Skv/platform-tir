import {
  Body,
  Controller,
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
import { MoneyMovementsService } from './money-movements.service';
import { ManagerIncassationsService } from './manager-incassations.service';
import { QueryMoneyMovementsDto } from './dto/query-money-movements.dto';
import {
  CreateManagerIncassationDto,
  QueryManagerIncassationsDto,
} from './dto/create-manager-incassation.dto';
import { CreateManualMoneyMovementDto } from './dto/create-manual-money-movement.dto';

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
  constructor(
    private readonly moneyMovementsService: MoneyMovementsService,
    private readonly managerIncassations: ManagerIncassationsService,
  ) {}

  @Get()
  findAll(@Query() query: QueryMoneyMovementsDto, @Req() req: RequestWithUser) {
    return this.moneyMovementsService.findAll({
      managerId: query.managerId,
      scope: query.scope,
      currentUserId: req.user?.id,
      direction: query.direction,
      paymentForm: query.paymentForm,
      paymentType: query.paymentType,
      entryKind: query.entryKind,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  /** Наличные менеджера (по умолчанию — текущего) с момента последней инкассации. */
  @Get('incassations/cash-balance')
  getIncassationCashBalance(
    @Query('managerId') managerId: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.managerIncassations.getIncassationCashBalance(managerId?.trim() || req.user!.id);
  }

  /** Последние инкассации менеджеров. */
  @Get('incassations')
  listIncassations(@Query() query: QueryManagerIncassationsDto) {
    return this.managerIncassations.listIncassations(query.limit);
  }

  /** Запись инкассации: менеджер — текущий пользователь, ФИО инкассатора фиксирует он же. */
  @Post('incassations')
  @HttpCode(HttpStatus.CREATED)
  createIncassation(@Body() dto: CreateManagerIncassationDto, @Req() req: RequestWithUser) {
    return this.managerIncassations.createIncassation(dto, req.user?.id);
  }

  /** Ручная запись (проводка): изъятие из кассы или внесение сумм вне оплат по договорам. */
  @Post('manual-entry')
  @HttpCode(HttpStatus.CREATED)
  createManualEntry(@Body() dto: CreateManualMoneyMovementDto, @Req() req: RequestWithUser) {
    return this.moneyMovementsService.createManualEntry(dto, req.user?.id);
  }

  /**
   * Правка ручной записи — только супер-админ: исправление ошибок других пользователей.
   * Роль на методе перекрывает список CRM_ROLES класса (RolesGuard getAllAndOverride).
   */
  @Patch('manual-entry/:id')
  @Roles('SUPER_ADMIN')
  updateManualEntry(@Param('id') id: string, @Body() dto: CreateManualMoneyMovementDto) {
    return this.moneyMovementsService.updateManualEntry(id, dto);
  }
}
