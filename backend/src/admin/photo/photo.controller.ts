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
import { PhotoService } from './photo.service';
import { CreatePhotoCategoryDto } from './dto/create-photo-category.dto';
import { CreatePhotoProjectDto } from './dto/create-photo-project.dto';
import { UpdatePhotoProjectDto } from './dto/update-photo-project.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Request } from 'express';

const uploadDir = path.join(process.cwd(), 'uploads', 'photo');

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `temp-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

@ApiTags('admin/photo')
@Controller('admin/photo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
@ApiBearerAuth()
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

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
  @ApiOperation({ summary: 'Загрузить изображение' })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.photoService.uploadImage(file, baseUrl);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Создать категорию' })
  createCategory(@Body() dto: CreatePhotoCategoryDto) {
    return this.photoService.createCategory(dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Список категорий' })
  findAllCategories() {
    return this.photoService.findAllCategories();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Категория по ID' })
  findCategory(@Param('id') id: string) {
    return this.photoService.findOneCategory(id);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Обновить категорию' })
  updateCategory(@Param('id') id: string, @Body() data: Partial<CreatePhotoCategoryDto>) {
    return this.photoService.updateCategory(id, data);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Удалить категорию' })
  removeCategory(@Param('id') id: string) {
    return this.photoService.removeCategory(id);
  }

  @Post('projects')
  @ApiOperation({ summary: 'Создать объект (проект)' })
  createProject(@Body() dto: CreatePhotoProjectDto) {
    return this.photoService.createProject(dto);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Список объектов' })
  findAllProjects(
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.photoService.findAllProjects({
      categoryId,
      categorySlug,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Объект по ID' })
  findOneProject(@Param('id') id: string) {
    return this.photoService.findOneProject(id);
  }

  @Patch('projects/:id')
  @ApiOperation({ summary: 'Обновить объект' })
  updateProject(@Param('id') id: string, @Body() dto: UpdatePhotoProjectDto) {
    return this.photoService.updateProject(id, dto);
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: 'Удалить объект' })
  removeProject(@Param('id') id: string) {
    return this.photoService.removeProject(id);
  }

  @Post('photos')
  @ApiOperation({ summary: 'Добавить фото' })
  createPhoto(@Body() dto: CreatePhotoDto) {
    return this.photoService.createPhoto(dto);
  }

  @Post('photos/batch')
  @ApiOperation({ summary: 'Добавить несколько фото к объекту' })
  createPhotos(@Body() body: { projectId: string; imageUrls: string[] }) {
    return this.photoService.createPhotos(body.projectId, body.imageUrls);
  }

  @Get('photos')
  @ApiOperation({ summary: 'Список фото' })
  findAllPhotos(
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.photoService.findAllPhotos({
      projectId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('photos/:id')
  @ApiOperation({ summary: 'Фото по ID' })
  findOnePhoto(@Param('id') id: string) {
    return this.photoService.findOnePhoto(id);
  }

  @Patch('photos/:id')
  @ApiOperation({ summary: 'Обновить фото' })
  updatePhoto(@Param('id') id: string, @Body() dto: UpdatePhotoDto) {
    return this.photoService.updatePhoto(id, dto);
  }

  @Delete('photos/:id')
  @ApiOperation({ summary: 'Удалить фото' })
  removePhoto(@Param('id') id: string) {
    return this.photoService.removePhoto(id);
  }
}
