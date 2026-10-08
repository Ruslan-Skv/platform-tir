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
import { SalaryContractsService } from './salary-contracts.service';
import {
  CreateSalaryContractDto,
  QuerySalaryContractsDto,
  UpdateSalaryContractDto,
} from './dto/salary-contract.dto';

/**
 * Реестр договоров для расчёта з/п (аналог листов «19о», «19-50/50» таблицы).
 */
const SALARY_SECTION_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

@Controller('admin/salary/contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SALARY_SECTION_ROLES)
export class SalaryContractsController {
  constructor(private readonly contracts: SalaryContractsService) {}

  @Get()
  findAll(@Query() query: QuerySalaryContractsDto) {
    return this.contracts.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contracts.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('SUPER_ADMIN', 'ADMIN')
  create(@Body() dto: CreateSalaryContractDto, @Req() req: RequestWithUser) {
    return this.contracts.create(dto, req.user?.id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSalaryContractDto,
    @Req() req: RequestWithUser,
  ) {
    return this.contracts.update(id, dto, req.user?.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.contracts.remove(id);
  }
}
