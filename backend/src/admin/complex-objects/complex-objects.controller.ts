import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ComplexObjectsService } from './complex-objects.service';
import { CreateComplexObjectDto } from './dto/create-complex-object.dto';
import { UpdateComplexObjectDto } from './dto/update-complex-object.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/types/request-with-user.types';

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

@Controller('admin/complex-objects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class ComplexObjectsController {
  constructor(private readonly service: ComplexObjectsService) {}

  @Post()
  create(@Body() dto: CreateComplexObjectDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id/contracts')
  getContracts(@Param('id') id: string) {
    return this.service.getContracts(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/rollback/:historyId')
  rollback(
    @Param('id') id: string,
    @Param('historyId') historyId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.rollback(id, historyId, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateComplexObjectDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.update(id, dto, req.user?.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
