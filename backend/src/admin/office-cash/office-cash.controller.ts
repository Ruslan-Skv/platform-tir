import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { PrismaService } from '../../database/prisma.service';
import { OfficeCashService } from './office-cash.service';
import { CreateOfficeOtherExpenseDto } from './dto/create-other-expense.dto';
import { CreateOfficeIncassationDto } from './dto/create-incassation.dto';
import { UpdateOtherExpenseCollectionDto } from './dto/update-other-expense-collection.dto';

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

@Controller('admin/office-cash')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
@ApiBearerAuth()
@ApiTags('Office cash')
export class OfficeCashController {
  constructor(
    private readonly service: OfficeCashService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Сводка по кассе офиса: поступления, прочие расходы, инкассации, остаток',
  })
  getSummary(
    @Query('officeId') officeId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getCashSummary(officeId, dateFrom, dateTo);
  }

  @Get('other-expenses')
  @ApiOperation({ summary: 'Прочие расходы (бытовые нужды) по офису' })
  getOtherExpenses(
    @Query('officeId') officeId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getOtherExpenses(officeId, dateFrom, dateTo);
  }

  @Post('other-expenses')
  @ApiOperation({ summary: 'Добавить прочий расход' })
  createOtherExpense(@Body() dto: CreateOfficeOtherExpenseDto, @Req() req: RequestWithUser) {
    return this.service.createOtherExpense(dto, req.user?.id);
  }

  @Patch('other-expenses/:id/collection-amount')
  @ApiOperation({ summary: 'Обновить сумму инкассации по прочему расходу' })
  async updateOtherExpenseCollection(
    @Param('id') id: string,
    @Body() dto: UpdateOtherExpenseCollectionDto,
    @Req() req: RequestWithUser,
  ) {
    const canEdit =
      req.user.role === 'SUPER_ADMIN' ||
      (await this.prisma.adminResourcePermission.findFirst({
        where: {
          resourceId: 'admin.crm.contract-payments.incassation',
          userId: req.user.id,
          permission: 'EDIT',
        },
      }));
    if (!canEdit) {
      throw new ForbiddenException(
        'Только суперадмин или назначенное лицо может редактировать инкассацию',
      );
    }
    return this.service.updateOtherExpenseCollectionAmount(id, dto.collectionAmount ?? null);
  }

  @Get('incassations')
  @ApiOperation({ summary: 'Инкассации по офису' })
  getIncassations(
    @Query('officeId') officeId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getIncassations(officeId, dateFrom, dateTo);
  }

  @Post('incassations')
  @ApiOperation({ summary: 'Зафиксировать инкассацию (изъятие наличных)' })
  createIncassation(@Body() dto: CreateOfficeIncassationDto, @Req() req: RequestWithUser) {
    return this.service.createIncassation(dto, req.user?.id);
  }
}
