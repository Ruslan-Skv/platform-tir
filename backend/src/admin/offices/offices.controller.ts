import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OfficesService } from './offices.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
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

@Controller('admin/offices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class OfficesController {
  constructor(private readonly officesService: OfficesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  create(@Body() createOfficeDto: CreateOfficeDto) {
    return this.officesService.create(createOfficeDto);
  }

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.officesService.findAll(includeInactive === 'true');
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.officesService.getHistory(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.officesService.findOne(id);
  }

  @Post(':id/rollback/:historyId')
  rollback(
    @Param('id') id: string,
    @Param('historyId') historyId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.officesService.rollback(id, historyId, req.user.id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateOfficeDto: UpdateOfficeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.officesService.update(id, updateOfficeDto, req.user?.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.officesService.remove(id);
  }
}
