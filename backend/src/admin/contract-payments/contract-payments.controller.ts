import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ContractPaymentsService } from './contract-payments.service';
import { CreateContractPaymentDto } from './dto/create-contract-payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

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
  constructor(private readonly contractPaymentsService: ContractPaymentsService) {}

  @Post()
  create(@Body() dto: CreateContractPaymentDto) {
    return this.contractPaymentsService.create(dto);
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

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.contractPaymentsService.remove(id);
  }
}
