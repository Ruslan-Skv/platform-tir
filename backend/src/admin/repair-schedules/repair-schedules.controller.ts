import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RepairScheduleProjectStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { CreateRepairScheduleEntryDto } from './dto/create-repair-schedule-entry.dto';
import { CreateRepairScheduleProjectDto } from './dto/create-repair-schedule-project.dto';
import { SetRepairScheduleProjectStatusDto } from './dto/set-repair-schedule-project-status.dto';
import { UpdateRepairScheduleEntryDto } from './dto/update-repair-schedule-entry.dto';
import { UpdateRepairScheduleProjectDto } from './dto/update-repair-schedule-project.dto';
import { RepairSchedulesService } from './repair-schedules.service';

const SCHEDULE_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'INSTALLER',
] as const;

const PLANNER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

@Controller('admin/repair-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SCHEDULE_ROLES)
export class RepairSchedulesController {
  constructor(private readonly service: RepairSchedulesService) {}

  private assertPlanner(role: string) {
    if (!(PLANNER_ROLES as readonly string[]).includes(role)) {
      throw new ForbiddenException('Недостаточно прав');
    }
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateRepairScheduleProjectDto) {
    this.assertPlanner(req.user.role);
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(
    @Req() req: RequestWithUser,
    @Query('status') status?: RepairScheduleProjectStatus,
    @Query('installerId') installerId?: string,
    @Query('search') search?: string,
    @Query('staleOnly') staleOnly?: string,
  ) {
    this.assertPlanner(req.user.role);
    return this.service.findAll({
      status,
      installerId,
      search,
      staleOnly: staleOnly === '1' || staleOnly === 'true',
    });
  }

  @Get('my')
  findMy(
    @Req() req: RequestWithUser,
    @Query('status') status?: RepairScheduleProjectStatus,
    @Query('search') search?: string,
  ) {
    return this.service.findMy(req.user.id, { status, search });
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  importExcel(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
    @Query('years') years?: string,
  ) {
    this.assertPlanner(req.user.role);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Прикрепите файл Excel/CSV (.xlsx, .xls, .csv)');
    }
    const yearList = years
      ?.split(',')
      .map((y) => Number(y.trim()))
      .filter((y) => Number.isFinite(y) && y >= 2000 && y <= 2100);
    return this.service.importFromExcel(file.buffer, req.user.id, {
      years: yearList?.length ? yearList : [2025, 2026],
    });
  }

  @Get(':id')
  async findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    await this.service.assertCanAccessProject(id, req.user.id, req.user.role);
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateRepairScheduleProjectDto,
  ) {
    this.assertPlanner(req.user.role);
    return this.service.update(id, dto, req.user.id);
  }

  @Post(':id/status')
  setStatus(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: SetRepairScheduleProjectStatusDto,
  ) {
    this.assertPlanner(req.user.role);
    return this.service.setStatus(id, dto.status, req.user.id);
  }

  @Delete(':id')
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.assertPlanner(req.user.role);
    return this.service.remove(id);
  }

  @Post(':id/entries')
  async addEntry(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: CreateRepairScheduleEntryDto,
  ) {
    await this.service.assertCanAccessProject(id, req.user.id, req.user.role);
    return this.service.addEntry(id, dto, req.user.id);
  }

  @Patch(':id/entries/:entryId')
  async updateEntry(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateRepairScheduleEntryDto,
  ) {
    this.assertPlanner(req.user.role);
    return this.service.updateEntry(id, entryId, dto, req.user.id);
  }

  @Delete(':id/entries/:entryId')
  async removeEntry(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    this.assertPlanner(req.user.role);
    return this.service.removeEntry(id, entryId, req.user.id);
  }
}
