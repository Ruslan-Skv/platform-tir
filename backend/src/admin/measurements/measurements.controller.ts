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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { MeasurementsService } from './measurements.service';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/types/request-with-user.types';

const measurementPhotosDir = path.join(process.cwd(), 'uploads', 'measurements');

/** Максимум фото с результатами замера на странице замера. */
export const MEASUREMENT_PHOTOS_MAX = 5;

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
  create(@Body() createMeasurementDto: CreateMeasurementDto, @Req() req: RequestWithUser) {
    return this.measurementsService.create(createMeasurementDto, req.user?.id);
  }

  @Get()
  findAll(
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
    @Query('managerId') managerId?: string,
    @Query('surveyorId') surveyorId?: string,
    @Query('directionId') directionId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('hasCustomerId') hasCustomerId?: string,
    @Query('scope') scope?: string,
    @Query('myDirectionIds') myDirectionIds?: string,
    @Query('includeCounts') includeCounts?: string,
    @Query('countsMyDirectionIds') countsMyDirectionIds?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const truthy = (v?: string) => v === '1' || v === 'true' || v === 'yes';
    const sortByNorm =
      sortBy === 'receptionDate' || sortBy === 'executionDate' || sortBy === 'status'
        ? sortBy
        : undefined;
    const sortOrderNorm = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined;
    const scopeNorm =
      scope === 'mine' || scope === 'my_directions' || scope === 'all' ? scope : 'all';
    const parseIds = (raw?: string) =>
      (raw ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const userId = req.user?.id?.trim() || undefined;
    return this.measurementsService.findAll({
      status,
      managerId,
      surveyorId,
      directionId,
      search,
      dateFrom,
      dateTo,
      hasCustomerId: truthy(hasCustomerId),
      scope: scopeNorm,
      scopeUserId: scopeNorm === 'mine' ? userId : undefined,
      myDirectionIds: scopeNorm === 'my_directions' ? parseIds(myDirectionIds) : undefined,
      includeCounts: truthy(includeCounts),
      countsUserId: userId,
      countsMyDirectionIds: parseIds(countsMyDirectionIds),
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy: sortByNorm,
      sortOrder: sortOrderNorm,
    });
  }

  /** Замеры текущего пользователя как замерщика (аналог «Мои монтажи»). */
  @Get('my')
  findMy(
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
    @Query('directionId') directionId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('includeCounts') includeCounts?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const truthy = (v?: string) => v === '1' || v === 'true' || v === 'yes';
    const sortByNorm =
      sortBy === 'receptionDate' || sortBy === 'executionDate' || sortBy === 'status'
        ? sortBy
        : undefined;
    const sortOrderNorm = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined;
    return this.measurementsService.findMy(req.user?.id ?? '', {
      status,
      directionId,
      search,
      dateFrom,
      dateTo,
      includeCounts: includeCounts === undefined ? true : truthy(includeCounts),
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy: sortByNorm,
      sortOrder: sortOrderNorm,
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

  /** Фото с результатами замера (кнопка-скрепка на странице замера), до 5 фото. */
  @Post(':id/upload-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(measurementPhotosDir)) {
            fs.mkdirSync(measurementPhotosDir, { recursive: true });
          }
          cb(null, measurementPhotosDir);
        },
        filename: (_req, file, cb) => {
          cb(
            null,
            `measurement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname) || '.jpg'}`,
          );
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpe?g|png|webp|gif)$/i.test(file.originalname);
        if (!allowed) {
          cb(new BadRequestException('Допустимы только изображения: jpg, png, webp, gif'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const imageUrl = `/uploads/measurements/${path.basename(file.path)}`;
    const photoUrls = await this.measurementsService.appendPhotoUrl(id, imageUrl, req.user?.id);
    return { imageUrl, photoUrls };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.measurementsService.remove(id);
  }
}
