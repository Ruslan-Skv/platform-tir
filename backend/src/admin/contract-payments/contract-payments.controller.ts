import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ContractPaymentsService } from './contract-payments.service';
import { CreateContractPaymentDto } from './dto/create-contract-payment.dto';
import { UpdateCollectionAmountDto } from './dto/update-collection-amount.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { PrismaService } from '../../database/prisma.service';

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

@Controller('admin/contract-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class ContractPaymentsController {
  constructor(
    private readonly contractPaymentsService: ContractPaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  create(@Body() dto: CreateContractPaymentDto) {
    return this.contractPaymentsService.create(dto);
  }

  @Get('can-edit-incassation')
  @Roles(...CRM_ROLES)
  async canEditIncassation(@Req() req: RequestWithUser) {
    const canEdit =
      req.user.role === 'SUPER_ADMIN' ||
      (await this.prisma.adminResourcePermission.findFirst({
        where: {
          resourceId: 'admin.crm.contract-payments.incassation',
          userId: req.user.id,
          permission: 'EDIT',
        },
      }));
    return { canEdit: !!canEdit };
  }

  @Get()
  findAll(
    @Query('contractId') contractId?: string,
    @Query('officeId') officeId?: string,
    @Query('managerId') managerId?: string,
    @Query('paymentForm') paymentForm?: string,
    @Query('paymentType') paymentType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contractPaymentsService.findAll({
      contractId,
      officeId,
      managerId,
      paymentForm,
      paymentType,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractPaymentsService.findOne(id);
  }

  @Patch(':id/collection-amount')
  @Roles(...CRM_ROLES)
  async updateCollectionAmount(
    @Param('id') id: string,
    @Body() dto: UpdateCollectionAmountDto,
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
    return this.contractPaymentsService.updateCollectionAmount(id, dto.collectionAmount ?? null);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.contractPaymentsService.remove(id);
  }
}
