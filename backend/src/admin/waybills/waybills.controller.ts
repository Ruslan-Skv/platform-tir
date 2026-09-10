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
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { CompleteWaybillTaskDto } from './dto/complete-waybill-task.dto';
import { CreateWaybillTaskDto } from './dto/create-waybill-task.dto';
import { FailWaybillTaskDto } from './dto/fail-waybill-task.dto';
import { RescheduleWaybillTaskDto } from './dto/reschedule-waybill-task.dto';
import { UpsertDriverDeliveryAvailabilityDto } from './dto/upsert-driver-delivery-availability.dto';
import { UpdateWaybillTaskDto } from './dto/update-waybill-task.dto';
import { DriverDeliveryAvailabilityService } from './driver-delivery-availability.service';
import { WaybillsService } from './waybills.service';

const WAYBILL_ROLES = [
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

const WAYBILL_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'waybills');

/** Разрешённые типы вложений: картинки, PDF, Word, Excel, текст. */
const WAYBILL_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/heic',
  'image/heif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/rtf',
  'text/plain',
]);

const waybillAttachmentStorage = diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(WAYBILL_UPLOAD_DIR, { recursive: true });
    cb(null, WAYBILL_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomUUID()}${ext || ''}`);
  },
});

@Controller('admin/waybills')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...WAYBILL_ROLES)
export class WaybillsController {
  constructor(
    private readonly waybillsService: WaybillsService,
    private readonly driverAvailabilityService: DriverDeliveryAvailabilityService,
  ) {}

  private assertPlanner(role: string) {
    if (!(PLANNER_ROLES as readonly string[]).includes(role)) {
      throw new ForbiddenException('Недостаточно прав');
    }
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateWaybillTaskDto) {
    return this.waybillsService.create(dto, req.user.id);
  }

  @Get()
  findByDate(
    @Query('date') date?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (dateFrom?.trim() || dateTo?.trim()) {
      return this.waybillsService.findByDateRange({ dateFrom, dateTo });
    }
    if (date?.trim()) {
      return this.waybillsService.findByDate(date);
    }
    const today = new Date().toISOString().slice(0, 10);
    return this.waybillsService.findByDateRange({ dateFrom: today, dateTo: today });
  }

  @Get('my')
  findMy(
    @Req() req: RequestWithUser,
    @Query('date') date?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (dateFrom?.trim() || dateTo?.trim()) {
      return this.waybillsService.findMyByDateRange(req.user.id, { dateFrom, dateTo });
    }
    return this.waybillsService.findMyByDate(req.user.id, date);
  }

  @Get('trash/count')
  trashCount() {
    return this.waybillsService.trashCount().then((count) => ({ count }));
  }

  @Get('trash')
  findTrash(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.waybillsService.findTrash({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('driver-availability')
  listDriverAvailability(@Req() req: RequestWithUser) {
    this.assertPlanner(req.user.role);
    return this.driverAvailabilityService.list();
  }

  @Get('driver-availability/resolve')
  resolveDriverAvailability(
    @Req() req: RequestWithUser,
    @Query('date') date?: string,
    @Query('timeFrom') timeFrom?: string,
  ) {
    this.assertPlanner(req.user.role);
    if (!date?.trim()) {
      throw new BadRequestException('Укажите date');
    }
    return this.driverAvailabilityService.resolveAll(date, timeFrom);
  }

  @Put('driver-availability/:userId')
  upsertDriverAvailability(
    @Req() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() dto: UpsertDriverDeliveryAvailabilityDto,
  ) {
    this.assertPlanner(req.user.role);
    return this.driverAvailabilityService.upsert(userId, dto);
  }

  @Delete('driver-availability/:userId')
  removeDriverAvailability(@Req() req: RequestWithUser, @Param('userId') userId: string) {
    this.assertPlanner(req.user.role);
    return this.driverAvailabilityService.remove(userId);
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: waybillAttachmentStorage,
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!WAYBILL_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
          cb(
            new BadRequestException(
              `Тип файла не поддерживается: ${file.mimetype || 'неизвестен'}`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadAttachments(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    this.assertPlanner(req.user.role);
    if (!files?.length) {
      throw new BadRequestException('Файлы не переданы');
    }
    return this.waybillsService.addAttachments(id, files, req.user.id);
  }

  @Delete('attachments/:attachmentId')
  removeAttachment(@Param('attachmentId') attachmentId: string, @Req() req: RequestWithUser) {
    this.assertPlanner(req.user.role);
    return this.waybillsService.removeAttachment(attachmentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.waybillsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req: RequestWithUser, @Body() dto: UpdateWaybillTaskDto) {
    return this.waybillsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.waybillsService.remove(id, req.user.id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.waybillsService.restore(id);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() dto: CompleteWaybillTaskDto,
  ) {
    return this.waybillsService.complete(id, req.user.id, req.user.role, dto);
  }

  @Post(':id/fail')
  fail(@Param('id') id: string, @Req() req: RequestWithUser, @Body() dto: FailWaybillTaskDto) {
    return this.waybillsService.fail(id, req.user.id, req.user.role, dto);
  }

  @Post(':id/reschedule')
  reschedule(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() dto: RescheduleWaybillTaskDto,
  ) {
    this.assertPlanner(req.user.role);
    return this.waybillsService.reschedule(id, dto, req.user.id, req.user.role);
  }

  @Post(':id/reopen')
  reopen(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.waybillsService.reopen(id, req.user.role);
  }
}
