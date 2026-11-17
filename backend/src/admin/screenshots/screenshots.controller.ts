import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestWithUser } from '../../common/types/request-with-user.types';
import { CreateAdminScreenshotDto, ListAdminScreenshotsDto } from './dto/screenshots.dto';
import { AdminScreenshotsService } from './screenshots.service';
import {
  SCREENSHOT_ALLOWED_MIME,
  SCREENSHOT_MAX_FILE_SIZE,
  SCREENSHOTS_UPLOAD_DIR,
} from './screenshots.constants';

const screenshotsUploadStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(SCREENSHOTS_UPLOAD_DIR)) {
      fs.mkdirSync(SCREENSHOTS_UPLOAD_DIR, { recursive: true });
    }
    cb(null, SCREENSHOTS_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = SCREENSHOT_ALLOWED_MIME[file.mimetype] ?? '.png';
    cb(null, `screenshot-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`);
  },
});

/**
 * Скриншоты из приложения: любой админ снимает экран кнопкой 📷 в шапке,
 * файл сохраняется на сервере на 3 суток. Видят их суперадмин и сам автор.
 */
@Controller('admin/screenshots')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
export class AdminScreenshotsController {
  constructor(private readonly screenshotsService: AdminScreenshotsService) {}

  @Get()
  @SkipThrottle()
  list(@Request() req: RequestWithUser, @Query() query: ListAdminScreenshotsDto) {
    return this.screenshotsService.list(req.user, {
      authorId: query.authorId,
      limit: query.limit,
    });
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: screenshotsUploadStorage,
      limits: { fileSize: SCREENSHOT_MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!SCREENSHOT_ALLOWED_MIME[file.mimetype]) {
          cb(
            new BadRequestException('Скриншот должен быть изображением PNG, JPEG или WebP'),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @Request() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateAdminScreenshotDto,
  ) {
    if (!file) {
      throw new BadRequestException('Файл скриншота не передан');
    }
    return this.screenshotsService.create(req.user.id, file, dto);
  }

  @Get(':id/file')
  @SkipThrottle()
  async getFile(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, mimeType, fileName } = await this.screenshotsService.openFile(req.user, id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return new StreamableFile(stream);
  }

  @Get(':id/download')
  @SkipThrottle()
  async download(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, mimeType, fileName } = await this.screenshotsService.openFile(req.user, id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(stream);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.screenshotsService.remove(req.user, id);
  }
}
