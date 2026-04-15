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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ServiceCatalogService } from './service-catalog.service';
import { CreateServiceCatalogCategoryDto } from './dto/create-service-catalog-category.dto';
import { UpdateServiceCatalogCategoryDto } from './dto/update-service-catalog-category.dto';
import { CreateServiceCatalogItemDto } from './dto/create-service-catalog-item.dto';
import { UpdateServiceCatalogItemDto } from './dto/update-service-catalog-item.dto';
import { UpdateServiceCatalogBlockDto } from './dto/update-service-catalog-block.dto';
import { ReorderServiceCatalogCategoryDto } from './dto/reorder-service-catalog-category.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin/service-catalog')
@Controller('admin/service-catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
@ApiBearerAuth()
export class ServiceCatalogController {
  constructor(private readonly service: ServiceCatalogService) {}

  @Get('block')
  @ApiOperation({ summary: 'Получить настройки блока' })
  getBlock() {
    return this.service.getBlock();
  }

  @Patch('block')
  @ApiOperation({ summary: 'Обновить настройки блока' })
  updateBlock(@Body() dto: UpdateServiceCatalogBlockDto) {
    return this.service.updateBlock(dto);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Создать категорию' })
  createCategory(@Body() dto: CreateServiceCatalogCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Список категорий' })
  findAllCategories(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAllCategories(includeInactive === 'true');
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Категория по ID' })
  findCategory(@Param('id') id: string) {
    return this.service.findCategoryById(id);
  }

  @Post('categories/:id/reorder')
  @ApiOperation({
    summary: 'Поменять порядок категории среди соседей',
    description:
      'Соседи определяются только по parentId в БД; корневые и вложенные группы не смешиваются.',
  })
  reorderCategorySibling(
    @Param('id') id: string,
    @Body() dto: ReorderServiceCatalogCategoryDto,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.reorderCategoryAmongSiblings(id, dto.direction, includeInactive === 'true');
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Обновить категорию' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateServiceCatalogCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Удалить категорию' })
  removeCategory(@Param('id') id: string) {
    return this.service.removeCategory(id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Создать вид работ' })
  createItem(@Body() dto: CreateServiceCatalogItemDto) {
    return this.service.createItem(dto);
  }

  @Get('items')
  @ApiOperation({ summary: 'Список видов работ' })
  findAllItems(
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAllItems({
      categoryId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Вид работ по ID' })
  findItem(@Param('id') id: string) {
    return this.service.findItemById(id);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Обновить вид работ' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateServiceCatalogItemDto) {
    return this.service.updateItem(id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Удалить вид работ' })
  removeItem(@Param('id') id: string) {
    return this.service.removeItem(id);
  }
}
