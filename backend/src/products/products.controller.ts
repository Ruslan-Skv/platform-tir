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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { PriceScraperService } from './price-scraper.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly priceScraperService: PriceScraperService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать товар' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все товары (только активные)' })
  findAll() {
    return this.productsService.findAll();
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить все товары для админки (включая неактивные)' })
  findAllAdmin() {
    return this.productsService.findAllAdmin();
  }

  @Post('admin/sync-supplier-prices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Массовая синхронизация цен поставщика по ссылкам' })
  async syncSupplierPrices() {
    return this.productsService.syncSupplierPrices();
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск товаров' })
  search(@Query() searchDto: SearchProductsDto) {
    return this.productsService.search(searchDto);
  }

  @Get('catalog/all')
  @ApiOperation({ summary: 'Получить все товары каталога' })
  findAllProducts() {
    return this.productsService.findAllProducts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить товар по ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Получить товар по slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get('category/:categorySlug')
  @ApiOperation({ summary: 'Получить товары по категории (slug)' })
  findByCategory(@Param('categorySlug') categorySlug: string) {
    return this.productsService.findByCategory(categorySlug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить товар' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить товар' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get('scrape/price')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить цену товара по ссылке поставщика' })
  @ApiQuery({ name: 'url', required: true, description: 'URL товара у поставщика' })
  async getPriceFromUrl(@Query('url') url: string) {
    const price = await this.priceScraperService.getPriceFromUrl(url);
    return { price };
  }
}
