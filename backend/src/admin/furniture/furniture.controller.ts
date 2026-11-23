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
import { FurnitureService } from './furniture.service';
import { CreateFurnitureCategoryDto } from './dto/create-furniture-category.dto';
import { UpdateFurnitureCategoryDto } from './dto/update-furniture-category.dto';
import { CreateFurnitureProductDto } from './dto/create-furniture-product.dto';
import { UpdateFurnitureProductDto } from './dto/update-furniture-product.dto';
import { UpdateFurnitureSettingsDto } from './dto/update-furniture-settings.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Request } from 'express';

const uploadDir = path.join(process.cwd(), 'uploads', 'furniture');

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `temp-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

@ApiTags('admin/furniture')
@Controller('admin/furniture')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
@ApiBearerAuth()
export class FurnitureController {
  constructor(private readonly furnitureService: FurnitureService) {}

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
  @ApiOperation({ summary: 'Загрузить изображение для раздела «Мебель»' })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.furnitureService.uploadImage(file, baseUrl);
  }

  // ===== Категории изделий =====

  @Get('categories')
  @ApiOperation({ summary: 'Список категорий изделий' })
  findCategories() {
    return this.furnitureService.findCategories();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Категория по ID' })
  findCategory(@Param('id') id: string) {
    return this.furnitureService.findCategory(id);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Создать категорию' })
  createCategory(@Body() dto: CreateFurnitureCategoryDto) {
    return this.furnitureService.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Обновить категорию' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateFurnitureCategoryDto) {
    return this.furnitureService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Удалить категорию (вместе с изделиями)' })
  removeCategory(@Param('id') id: string) {
    return this.furnitureService.removeCategory(id);
  }

  // ===== Изделия =====

  @Get('products')
  @ApiOperation({ summary: 'Список изделий (опционально по категории)' })
  findProducts(@Query('categoryId') categoryId?: string) {
    return this.furnitureService.findProducts(categoryId);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Изделие по ID' })
  findProduct(@Param('id') id: string) {
    return this.furnitureService.findProduct(id);
  }

  @Post('products')
  @ApiOperation({ summary: 'Создать изделие' })
  createProduct(@Body() dto: CreateFurnitureProductDto) {
    return this.furnitureService.createProduct(dto);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Обновить изделие' })
  updateProduct(@Param('id') id: string, @Body() dto: UpdateFurnitureProductDto) {
    return this.furnitureService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Удалить изделие' })
  removeProduct(@Param('id') id: string) {
    return this.furnitureService.removeProduct(id);
  }

  // ===== Настройки раздела =====

  @Get('settings')
  @ApiOperation({ summary: 'Настройки раздела «Мебель»' })
  getSettings() {
    return this.furnitureService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки раздела «Мебель»' })
  updateSettings(@Body() dto: UpdateFurnitureSettingsDto) {
    return this.furnitureService.updateSettings(dto);
  }
}
