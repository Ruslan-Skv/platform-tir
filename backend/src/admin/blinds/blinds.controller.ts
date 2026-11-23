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
import { BlindsService } from './blinds.service';
import { CreateBlindsCategoryDto } from './dto/create-blinds-category.dto';
import { UpdateBlindsCategoryDto } from './dto/update-blinds-category.dto';
import { CreateBlindsProductDto } from './dto/create-blinds-product.dto';
import { UpdateBlindsProductDto } from './dto/update-blinds-product.dto';
import { UpdateBlindsSettingsDto } from './dto/update-blinds-settings.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Request } from 'express';

const uploadDir = path.join(process.cwd(), 'uploads', 'blinds');

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `temp-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

@ApiTags('admin/blinds')
@Controller('admin/blinds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
@ApiBearerAuth()
export class BlindsController {
  constructor(private readonly blindsService: BlindsService) {}

  @Post('upload')
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
  @ApiOperation({ summary: 'Загрузить изображение для раздела «Жалюзи»' })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.blindsService.uploadImage(file, baseUrl);
  }

  // ===== Категории изделий =====

  @Get('categories')
  @ApiOperation({ summary: 'Список категорий изделий' })
  findCategories() {
    return this.blindsService.findCategories();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Категория по ID' })
  findCategory(@Param('id') id: string) {
    return this.blindsService.findCategory(id);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Создать категорию' })
  createCategory(@Body() dto: CreateBlindsCategoryDto) {
    return this.blindsService.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Обновить категорию' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateBlindsCategoryDto) {
    return this.blindsService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Удалить категорию (вместе с изделиями)' })
  removeCategory(@Param('id') id: string) {
    return this.blindsService.removeCategory(id);
  }

  // ===== Изделия =====

  @Get('products')
  @ApiOperation({ summary: 'Список изделий (опционально по категории)' })
  findProducts(@Query('categoryId') categoryId?: string) {
    return this.blindsService.findProducts(categoryId);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Изделие по ID' })
  findProduct(@Param('id') id: string) {
    return this.blindsService.findProduct(id);
  }

  @Post('products')
  @ApiOperation({ summary: 'Создать изделие' })
  createProduct(@Body() dto: CreateBlindsProductDto) {
    return this.blindsService.createProduct(dto);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Обновить изделие' })
  updateProduct(@Param('id') id: string, @Body() dto: UpdateBlindsProductDto) {
    return this.blindsService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Удалить изделие' })
  removeProduct(@Param('id') id: string) {
    return this.blindsService.removeProduct(id);
  }

  // ===== Настройки раздела =====

  @Get('settings')
  @ApiOperation({ summary: 'Настройки раздела «Жалюзи»' })
  getSettings() {
    return this.blindsService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки раздела «Жалюзи»' })
  updateSettings(@Body() dto: UpdateBlindsSettingsDto) {
    return this.blindsService.updateSettings(dto);
  }
}
