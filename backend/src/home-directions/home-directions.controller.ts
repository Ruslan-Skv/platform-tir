import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { extname } from 'path';
import { HomeDirectionsService } from './home-directions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { Request } from 'express';

const uploadDir = process.cwd() + '/uploads/directions';

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `temp-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

@ApiTags('home-directions')
@Controller('home/directions')
export class HomeDirectionsController {
  constructor(private readonly homeDirections: HomeDirectionsService) {}

  @Get('images')
  @ApiOperation({ summary: 'Получить URL картинок для раздела «Наши направления» (публичный)' })
  getImages(@Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.homeDirections.getImages(baseUrl);
  }

  @Get('slugs')
  @ApiOperation({ summary: 'Список slug направлений (публичный)' })
  getSlugs() {
    return { slugs: this.homeDirections.getSlugs() };
  }
}

@ApiTags('admin/home-directions')
@Controller('admin/home/directions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminHomeDirectionsController {
  constructor(private readonly homeDirections: HomeDirectionsService) {}

  @Get('images')
  @ApiOperation({ summary: 'Получить URL картинок (админ)' })
  getImages(@Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.homeDirections.getImages(baseUrl);
  }

  @Post('upload/:slug')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 5 * 1024 * 1024 },
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: 'Загрузить картинку для направления' })
  async upload(
    @Param('slug') slug: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.homeDirections.uploadImage(slug, file, baseUrl);
  }
}
