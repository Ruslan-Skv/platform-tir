import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CrmDirectionsService } from './crm-directions.service';
import { CreateCrmDirectionDto } from './dto/create-crm-direction.dto';
import { UpdateCrmDirectionDto } from './dto/update-crm-direction.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const CRM_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
] as const;

@Controller('admin/crm-directions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class CrmDirectionsController {
  constructor(private readonly crmDirectionsService: CrmDirectionsService) {}

  @Post()
  create(@Body() createCrmDirectionDto: CreateCrmDirectionDto) {
    return this.crmDirectionsService.create(createCrmDirectionDto);
  }

  @Get()
  findAll() {
    return this.crmDirectionsService.findAll();
  }

  @Get('users/list')
  getCrmUsers() {
    return this.crmDirectionsService.getCrmUsers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crmDirectionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCrmDirectionDto: UpdateCrmDirectionDto) {
    return this.crmDirectionsService.update(id, updateCrmDirectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmDirectionsService.remove(id);
  }
}
