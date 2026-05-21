import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ContractDocumentObjectsService } from './contract-document-objects.service';
import { AttachContractDocumentObjectMembersDto } from './dto/attach-contract-document-object-members.dto';
import { CreateContractDocumentObjectDto } from './dto/create-contract-document-object.dto';
import { UpdateContractDocumentObjectDto } from './dto/update-contract-document-object.dto';

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

@Controller('admin/contract-document-objects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class ContractDocumentObjectsController {
  constructor(private readonly service: ContractDocumentObjectsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('suggest-merge')
  suggestMerge(
    @Query('address') address: string,
    @Query('excludeObjectId') excludeObjectId?: string,
  ) {
    return this.service.suggestMerge(address ?? '', excludeObjectId);
  }

  @Post('auto-sync')
  autoSyncByAddress() {
    return this.service.autoSyncByAddress();
  }

  @Post()
  create(@Body() dto: CreateContractDocumentObjectDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContractDocumentObjectDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/members')
  attachMembers(@Param('id') id: string, @Body() dto: AttachContractDocumentObjectMembersDto) {
    return this.service.attachMembers(id, dto);
  }

  @Delete(':id/members/:packageId')
  detachMember(@Param('id') id: string, @Param('packageId') packageId: string) {
    return this.service.detachMember(id, packageId);
  }
}
