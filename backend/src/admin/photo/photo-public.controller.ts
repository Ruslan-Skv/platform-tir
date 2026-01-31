import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PhotoService } from './photo.service';

@ApiTags('photo')
@Controller('photo')
export class PhotoPublicController {
  constructor(private readonly photoService: PhotoService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Категории фото (публичный)' })
  getCategories() {
    return this.photoService.getPublicCategories();
  }

  @Get()
  @ApiOperation({ summary: 'Список объектов с фото (публичный)' })
  getProjects(
    @Query('category') categorySlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.photoService.getPublicProjects(
      categorySlug,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 12,
    );
  }
}
