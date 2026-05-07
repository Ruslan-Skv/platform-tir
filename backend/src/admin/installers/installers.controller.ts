import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateInstallerDto } from './dto/create-installer.dto';
import { UpdateInstallerDto } from './dto/update-installer.dto';
import { InstallersService } from './installers.service';

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

@Controller('admin/installers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class InstallersController {
  constructor(private readonly installersService: InstallersService) {}

  @Post()
  create(@Body() dto: CreateInstallerDto) {
    return this.installersService.create(dto);
  }

  @Get()
  findAll() {
    return this.installersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.installersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInstallerDto) {
    return this.installersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.installersService.remove(id);
  }
}
