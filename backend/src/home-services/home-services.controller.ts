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
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { HomeServicesService } from './home-services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateServicesBlockDto } from './dto/update-services-block.dto';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';
import { ReorderDto } from './dto/reorder.dto';
import type { Request } from 'express';

const imagesDir = path.join(process.cwd(), 'uploads', 'services', 'images');

@ApiTags('home-services')
@Controller('home/services')
export class HomeServicesController {
  constructor(private readonly homeServicesService: HomeServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные секции «Комплексные решения» (публичный)' })
  getData(@Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.homeServicesService.getData(baseUrl);
  }
}

@ApiTags('admin/home-services')
@Controller('admin/home/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminHomeServicesController {
  constructor(private readonly homeServicesService: HomeServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные секции (админ)' })
  getData(@Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.homeServicesService.getData(baseUrl);
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить заголовок секции' })
  updateBlock(@Body() dto: UpdateServicesBlockDto) {
    return this.homeServicesService.updateBlock(dto);
  }

  @Post('items/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
          cb(null, imagesDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `service-${Date.now()}${extname(file.originalname) || '.jpg'}`);
        },
      }),
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
  @ApiOperation({ summary: 'Загрузить изображение для услуги' })
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.homeServicesService.uploadImage(file, baseUrl);
  }

  @Post('items')
  @ApiOperation({ summary: 'Добавить услугу' })
  createItem(@Body() dto: CreateServiceItemDto) {
    return this.homeServicesService.createItem(dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Обновить услугу' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateServiceItemDto) {
    return this.homeServicesService.updateItem(id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Удалить услугу' })
  deleteItem(@Param('id') id: string) {
    return this.homeServicesService.deleteItem(id);
  }

  @Patch('items/reorder')
  @ApiOperation({ summary: 'Изменить порядок услуг' })
  reorderItems(@Body() dto: ReorderDto) {
    return this.homeServicesService.reorderItems(dto.ids);
  }
}
