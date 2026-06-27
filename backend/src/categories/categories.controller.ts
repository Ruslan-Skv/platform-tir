import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { RequestWithUser } from '../common/types/request-with-user.types';
import { CatalogAdminAuth } from '../auth/decorators/catalog-admin.decorator';
import { ADMIN_ROLES } from '../common/config/admin-roles.config';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Создать категорию' })
  create(@Body() createCategoryDto: CreateCategoryDto, @Request() req: RequestWithUser) {
    return this.categoriesService.create(createCategoryDto, req.user?.id);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Получить все категории' })
  findAll(@Query('includeInactive') includeInactive?: string, @Request() req?: RequestWithUser) {
    if (includeInactive === 'true') {
      const role = req?.user?.role;
      if (!role || !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
        throw new ForbiddenException('Недостаточно прав');
      }
    }
    return this.categoriesService.findAll(includeInactive === 'true');
  }

  @Get('flat')
  @ApiOperation({ summary: 'Получить все категории плоским списком' })
  findAllFlat() {
    return this.categoriesService.findAllFlat();
  }

  @Get('navigation')
  @ApiOperation({ summary: 'Получить структуру навигации' })
  getNavigation() {
    return this.categoriesService.getNavigationStructure();
  }

  // Атрибуты - общий список
  @Get('attributes/all')
  @ApiOperation({ summary: 'Получить все доступные атрибуты' })
  getAllAttributes() {
    return this.categoriesService.getAllAttributes();
  }

  @Get('attributes/by-categories')
  @SkipThrottle()
  @ApiOperation({ summary: 'Объединённые атрибуты для нескольких категорий' })
  getAttributesByCategories(@Query('ids') ids?: string) {
    const categoryIds = ids
      ? ids
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : [];
    return this.categoriesService.getMergedAttributesForCategories(categoryIds);
  }

  @Post('attributes')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Создать новый атрибут' })
  createAttribute(
    @Body()
    body: {
      name: string;
      slug: string;
      type?: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'COLOR';
      unit?: string;
      isFilterable?: boolean;
      values?: string[];
    },
  ) {
    return this.categoriesService.createAttribute(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить категорию по ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Получить категорию по slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Patch(':id')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Обновить категорию' })
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Удалить категорию' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  // ==================== АТРИБУТЫ КАТЕГОРИИ ====================

  @Get(':id/attributes')
  @SkipThrottle()
  @ApiOperation({ summary: 'Получить атрибуты категории' })
  getCategoryAttributes(@Param('id') id: string) {
    return this.categoriesService.getCategoryAttributes(id);
  }

  @Post(':id/attributes')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Добавить атрибут к категории' })
  addAttributeToCategory(
    @Param('id') id: string,
    @Body() body: { attributeId: string; isRequired?: boolean; order?: number },
  ) {
    return this.categoriesService.addAttributeToCategory(id, body);
  }

  @Post(':id/attributes/bulk')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Массовое добавление атрибутов к категории' })
  bulkAddAttributes(
    @Param('id') id: string,
    @Body() body: { attributeIds: string[]; isRequired?: boolean },
  ) {
    return this.categoriesService.bulkAddAttributesToCategory(id, body);
  }

  @Patch(':id/attributes/:attributeId')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Обновить настройки атрибута в категории' })
  updateCategoryAttribute(
    @Param('id') id: string,
    @Param('attributeId') attributeId: string,
    @Body() body: { isRequired?: boolean; order?: number },
  ) {
    return this.categoriesService.updateCategoryAttribute(id, attributeId, body);
  }

  @Delete(':id/attributes/:attributeId')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Удалить атрибут из категории' })
  removeAttributeFromCategory(@Param('id') id: string, @Param('attributeId') attributeId: string) {
    return this.categoriesService.removeAttributeFromCategory(id, attributeId);
  }

  @Post(':id/attributes/apply')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Применить атрибуты категории ко всем её товарам' })
  applyAttributesToProducts(
    @Param('id') id: string,
    @Body() body: { attributes: { attributeId: string; defaultValue?: string }[] },
  ) {
    return this.categoriesService.applyAttributesToProducts(id, body.attributes);
  }

  @Post(':id/attributes/inherit')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Унаследовать атрибуты от родительской категории' })
  inheritAttributesFromParent(@Param('id') id: string) {
    return this.categoriesService.inheritAttributesFromParentPublic(id);
  }
}

// Отдельный контроллер для атрибутов (public API с JWT)
@ApiTags('attributes')
@Controller('attributes')
export class AttributesPublicController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Patch(':id')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Обновить атрибут' })
  updateAttribute(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      type?: string;
      unit?: string | null;
      isFilterable?: boolean;
      values?: string[];
    },
  ) {
    return this.categoriesService.updateAttribute(id, body);
  }

  @Delete(':id')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Удалить атрибут' })
  deleteAttribute(@Param('id') id: string) {
    return this.categoriesService.deleteAttribute(id);
  }
}
