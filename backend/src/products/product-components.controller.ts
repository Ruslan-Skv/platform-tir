import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductComponentsService } from './product-components.service';
import { CreateProductComponentDto } from './dto/create-product-component.dto';
import { UpdateProductComponentDto } from './dto/update-product-component.dto';
import {
  LinkProductComponentDto,
  LinkProductComponentsBatchDto,
} from './dto/link-product-component.dto';
import { LinkProductComponentGroupDto } from './dto/link-product-component-group.dto';
import { CatalogAdminAuth } from '../auth/decorators/catalog-admin.decorator';

@ApiTags('product-components')
@Controller('product-components')
export class ProductComponentsController {
  constructor(private readonly componentsService: ProductComponentsService) {}

  @Post('product/:productId')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Создать комплектующее для товара' })
  create(@Param('productId') productId: string, @Body() createDto: CreateProductComponentDto) {
    return this.componentsService.create(productId, createDto);
  }

  @Post('product/:productId/link')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Привязать комплектующую из справочника к товару' })
  linkCatalogItem(@Param('productId') productId: string, @Body() dto: LinkProductComponentDto) {
    return this.componentsService.linkCatalogItem(productId, dto);
  }

  @Post('product/:productId/link-group')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Привязать все комплектующие из группы справочника' })
  linkCatalogGroup(
    @Param('productId') productId: string,
    @Body() dto: LinkProductComponentGroupDto,
  ) {
    return this.componentsService.linkCatalogGroup(productId, dto.groupId);
  }

  @Post('product/:productId/link-batch')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Привязать несколько комплектующих из справочника' })
  linkCatalogItemsBatch(
    @Param('productId') productId: string,
    @Body() dto: LinkProductComponentsBatchDto,
  ) {
    return this.componentsService.linkCatalogItemsBatch(productId, dto.catalogItemIds);
  }

  @Get('product/:productId/kit-price')
  @ApiOperation({ summary: 'Рассчитать стоимость комплекта для товара' })
  getKitPrice(@Param('productId') productId: string, @Query('canvasPrice') canvasPrice?: string) {
    const override = canvasPrice != null ? parseFloat(canvasPrice) : undefined;
    return this.componentsService.getKitPriceForProduct(productId, override);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все комплектующие (только активные)' })
  findAll(@Query('productId') productId?: string) {
    return this.componentsService.findAll(productId);
  }

  @Get('admin/all')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Получить все комплектующие для админки (включая неактивные)' })
  findAllAdmin(@Query('productId') productId?: string) {
    return this.componentsService.findAllAdmin(productId);
  }

  @Get('admin/names-by-category')
  @CatalogAdminAuth()
  @ApiOperation({
    summary:
      'Уникальные наименования комплектующих из товаров категории (опционально — всё поддерево категории)',
  })
  getNamesByCategory(
    @Query('categoryId') categoryId: string,
    @Query('includeSubtree') includeSubtree?: string,
  ) {
    if (!categoryId) return [];
    const subtree = includeSubtree === '1' || includeSubtree === 'true';
    return this.componentsService.getComponentNamesByCategoryId(categoryId, {
      includeSubtree: subtree,
    });
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Получить комплектующие для товара' })
  findByProductId(@Param('productId') productId: string) {
    return this.componentsService.findByProductId(productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить комплектующее по ID' })
  findOne(@Param('id') id: string) {
    return this.componentsService.findOne(id);
  }

  @Patch(':id')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Обновить комплектующее' })
  update(@Param('id') id: string, @Body() updateDto: UpdateProductComponentDto) {
    return this.componentsService.update(id, updateDto);
  }

  @Delete(':id')
  @CatalogAdminAuth()
  @ApiOperation({ summary: 'Удалить комплектующее' })
  remove(@Param('id') id: string) {
    return this.componentsService.remove(id);
  }
}
