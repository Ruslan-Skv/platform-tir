import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ContractDocumentPackageKind } from '@prisma/client';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { ContractDocumentPackagesService } from './contract-document-packages.service';
import { CreateContractDocumentPackageDto } from './dto/create-contract-document-package.dto';
import { SetGlobalContractTemplateDto } from './dto/set-global-contract-template.dto';
import { UpdateContractDocumentPackageDto } from './dto/update-contract-document-package.dto';

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

@Controller('admin/contract-document-packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class ContractDocumentPackagesController {
  constructor(private readonly service: ContractDocumentPackagesService) {}

  @Post()
  create(@Body() dto: CreateContractDocumentPackageDto, @Req() req: RequestWithUser) {
    return this.service.create(dto, req.user?.id);
  }

  @Get()
  findAll(@Query('kind') kind?: string) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    const k = kind && allowed.has(kind) ? (kind as ContractDocumentPackageKind) : undefined;
    return this.service.findAll(k);
  }

  @Get('global-templates')
  getGlobalTemplate(@Query('kind') kind: string, @Query('tab') tab: string) {
    const allowed = new Set<string>(Object.values(ContractDocumentPackageKind));
    if (!kind || !allowed.has(kind)) {
      throw new BadRequestException('Укажите корректный query-параметр kind');
    }
    if (!tab?.trim()) {
      throw new BadRequestException('Укажите query-параметр tab');
    }
    return this.service.getGlobalTemplate(kind as ContractDocumentPackageKind, tab.trim());
  }

  @Put('global-templates')
  setGlobalTemplate(@Body() dto: SetGlobalContractTemplateDto, @Req() req: RequestWithUser) {
    return this.service.setGlobalTemplate(dto, req.user?.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContractDocumentPackageDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
