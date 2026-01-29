import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
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
import * as path from 'path';
import { extname } from 'path';
import { HeroService } from './hero.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateHeroBlockDto } from './dto/update-hero-block.dto';
import { CreateHeroFeatureDto } from './dto/create-hero-feature.dto';
import { UpdateHeroFeatureDto } from './dto/update-hero-feature.dto';
import { ReorderDto } from './dto/reorder.dto';
import type { Request } from 'express';

const uploadDir = path.join(process.cwd(), 'uploads', 'hero');
const iconsDir = path.join(process.cwd(), 'uploads', 'hero', 'icons');

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `temp-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

@ApiTags('home-hero')
@Controller('home/hero')
export class HeroController {
  constructor(private readonly heroService: HeroService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные Hero-блока (публичный)' })
  getHero(@Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.heroService.getHeroData(baseUrl);
  }
}

@ApiTags('admin/home-hero')
@Controller('admin/home/hero')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminHeroController {
  constructor(private readonly heroService: HeroService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные Hero-блока (админ)' })
  getHero(@Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.heroService.getHeroData(baseUrl);
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить текст Hero-блока' })
  updateBlock(@Body() dto: UpdateHeroBlockDto) {
    return this.heroService.updateBlock(dto);
  }

  @Post('slides')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
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
  @ApiOperation({ summary: 'Загрузить слайд для Hero' })
  async uploadSlide(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.heroService.uploadSlide(file, baseUrl);
  }

  @Delete('slides/:id')
  @ApiOperation({ summary: 'Удалить слайд' })
  deleteSlide(@Param('id') id: string) {
    return this.heroService.deleteSlide(id);
  }

  @Patch('slides/reorder')
  @ApiOperation({ summary: 'Изменить порядок слайдов' })
  reorderSlides(@Body() dto: ReorderDto) {
    return this.heroService.reorderSlides(dto.ids);
  }

  @Post('features/icon')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
          cb(null, iconsDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `icon-${Date.now()}${extname(file.originalname) || '.png'}`);
        },
      }),
      limits: { fileSize: 512 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpe?g|png|webp|gif|svg)$/i.test(file.originalname);
        if (!allowed) {
          cb(
            new BadRequestException('Допустимы только изображения: jpg, png, webp, gif, svg'),
            false,
          );
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
  @ApiOperation({ summary: 'Загрузить иконку для преимущества' })
  async uploadFeatureIcon(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.heroService.uploadFeatureIcon(file, baseUrl);
  }

  @Post('features')
  @ApiOperation({ summary: 'Добавить преимущество' })
  createFeature(@Body() dto: CreateHeroFeatureDto) {
    return this.heroService.createFeature(dto);
  }

  @Patch('features/:id')
  @ApiOperation({ summary: 'Обновить преимущество' })
  updateFeature(@Param('id') id: string, @Body() dto: UpdateHeroFeatureDto) {
    return this.heroService.updateFeature(id, dto);
  }

  @Delete('features/:id')
  @ApiOperation({ summary: 'Удалить преимущество' })
  deleteFeature(@Param('id') id: string) {
    return this.heroService.deleteFeature(id);
  }

  @Patch('features/reorder')
  @ApiOperation({ summary: 'Изменить порядок преимуществ' })
  reorderFeatures(@Body() dto: ReorderDto) {
    return this.heroService.reorderFeatures(dto.ids);
  }
}
