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
  Request,
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
import type { Request as ExpressRequest } from 'express';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { CreateBlogBadgePresetDto } from './dto/create-blog-badge-preset.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithUser } from '../../common/types/request-with-user.types';

const blogUploadDir = path.join(process.cwd(), 'uploads', 'blog');

const blogUploadStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(blogUploadDir)) fs.mkdirSync(blogUploadDir, { recursive: true });
    cb(null, blogUploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `temp-${Date.now()}${extname(file.originalname) || '.jpg'}`);
  },
});

@Controller('admin/blog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // Posts
  @Post('posts')
  createPost(@Body() createBlogPostDto: CreateBlogPostDto, @Request() req: RequestWithUser) {
    return this.blogService.createPost(req.user.id, createBlogPostDto);
  }

  @Get('posts')
  findAllPosts(
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('authorId') authorId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.findAllPosts({
      status,
      categoryId,
      authorId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('posts/:id')
  findOnePost(@Param('id') id: string) {
    return this.blogService.findOnePost(id);
  }

  @Patch('posts/:id')
  updatePost(@Param('id') id: string, @Body() updateBlogPostDto: UpdateBlogPostDto) {
    return this.blogService.updatePost(id, updateBlogPostDto);
  }

  @Patch('posts/:id/publish')
  publishPost(@Param('id') id: string) {
    return this.blogService.publishPost(id);
  }

  @Delete('posts/:id')
  removePost(@Param('id') id: string) {
    return this.blogService.removePost(id);
  }

  // Categories
  @Post('categories')
  createCategory(@Body() createBlogCategoryDto: CreateBlogCategoryDto) {
    return this.blogService.createCategory(createBlogCategoryDto);
  }

  @Get('categories')
  findAllCategories() {
    return this.blogService.findAllCategories();
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() data: Partial<CreateBlogCategoryDto>) {
    return this.blogService.updateCategory(id, data);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.blogService.removeCategory(id);
  }

  @Get('badge-presets')
  findAllBadgePresets() {
    return this.blogService.findAllBadgePresets();
  }

  @Post('badge-presets')
  createBadgePreset(@Body() dto: CreateBlogBadgePresetDto) {
    return this.blogService.createBadgePreset(dto.label);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: blogUploadStorage,
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
  uploadFeaturedImage(@UploadedFile() file: Express.Multer.File, @Req() req: ExpressRequest) {
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.blogService.uploadFeaturedImage(file, baseUrl);
  }

  // Stats
  @Get('stats')
  getStats() {
    return this.blogService.getStats();
  }
}
