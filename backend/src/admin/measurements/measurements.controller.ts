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
import { MeasurementsService } from './measurements.service';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';
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

@Controller('admin/measurements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Post()
  create(@Body() createMeasurementDto: CreateMeasurementDto) {
    return this.measurementsService.create(createMeasurementDto);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('managerId') managerId?: string,
    @Query('surveyorId') surveyorId?: string,
    @Query('directionId') directionId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.measurementsService.findAll({
      status,
      managerId,
      surveyorId,
      directionId,
      search,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.measurementsService.getHistory(id);
  }

  @Post(':id/rollback/:historyId')
  rollback(
    @Param('id') id: string,
    @Param('historyId') historyId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.measurementsService.rollback(id, historyId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.measurementsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMeasurementDto: UpdateMeasurementDto,
    @Req() req: RequestWithUser,
  ) {
    return this.measurementsService.update(id, updateMeasurementDto, req.user?.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.measurementsService.remove(id);
  }
}
