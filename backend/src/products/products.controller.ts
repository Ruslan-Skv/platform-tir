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
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { PriceScraperService } from './price-scraper.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { ProductIdsDto } from './dto/product-ids.dto';
import { CompareProductIdsDto } from './dto/compare-product-ids.dto';
import { WishlistProductIdsDto } from './dto/wishlist-product-ids.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../common/types/request-with-user.types';
import { PublicCatalogService } from './public-catalog.service';
import { parsePublicCatalogListQuery } from './dto/public-catalog-list.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly priceScraperService: PriceScraperService,
    private readonly publicCatalogService: PublicCatalogService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать товар' })
  create(@Body() createProductDto: CreateProductDto, @Request() req: RequestWithUser) {
    return this.productsService.create(createProductDto, req.user?.id);
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

  @Get('admin/sizes-by-category')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список размеров из товаров категории (подсказки для формы)' })
  @ApiQuery({ name: 'categoryId', required: true, description: 'ID категории' })
  getSizesByCategory(@Query('categoryId') categoryId: string) {
    return this.productsService.getSizesByCategoryId(categoryId);
  }

  @Post('admin/sync-supplier-prices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Массовая синхронизация цен поставщика по ссылкам (все товары)' })
  async syncSupplierPrices() {
    return this.productsService.syncSupplierPrices();
  }

  @Post('admin/update-supplier-prices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Обновить цены поставщика по ссылкам для выбранных товаров',
  })
  async updateSupplierPrices(@Body() dto: ProductIdsDto) {
    return this.productsService.updateSupplierPrices(dto.productIds);
  }

  @Post('admin/apply-supplier-prices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Синхронизация: установить цену товара = цена поставщика для выбранных',
  })
  async applySupplierPrices(@Body() dto: ProductIdsDto) {
    return this.productsService.applySupplierPrices(dto.productIds);
  }

  @Post('compare-list')
  @ApiOperation({
    summary: 'Товары для сравнения по списку ID (публично, только активные, до 10 шт.)',
  })
  findManyForCompare(@Body() dto: CompareProductIdsDto) {
    return this.productsService.findManyActiveByIdsForCompare(dto.productIds);
  }

  @Post('wishlist-list')
  @ApiOperation({
    summary: 'Товары для избранного по списку ID (публично, только активные, до 500 шт. за запрос)',
  })
  findManyForWishlist(@Body() dto: WishlistProductIdsDto) {
    return this.productsService.findManyActiveByIdsForWishlist(dto.productIds);
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск товаров' })
  search(@Query() searchDto: SearchProductsDto) {
    return this.productsService.search(searchDto);
  }

  @Get('search/suggestions')
  @ApiOperation({ summary: 'Подсказки по товарам для строки поиска' })
  @ApiQuery({ name: 'q', required: true, description: 'Строка поиска (от 2 символов)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Число подсказок, по умолчанию 8, макс. 20',
  })
  async searchSuggestions(@Query('q') q: string, @Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 8;
    const suggestions = await this.productsService.searchSuggestions(
      q ?? '',
      Number.isFinite(lim) ? lim : 8,
    );
    return { suggestions };
  }

  @Get('catalog/list')
  @ApiOperation({
    summary: 'Публичный каталог: пагинация, фильтры и сортировка',
  })
  findCatalogList(@Query() query: Record<string, string | string[] | undefined>) {
    return this.publicCatalogService.list(parsePublicCatalogListQuery(query));
  }

  @Get('catalog/page')
  @ApiOperation({
    summary: 'Публичный каталог: список + faceted-фильтры одним запросом (SSR)',
  })
  findCatalogPage(@Query() query: Record<string, string | string[] | undefined>) {
    return this.publicCatalogService.getPage(parsePublicCatalogListQuery(query));
  }

  @Get('catalog/filters')
  @ApiOperation({
    summary: 'Faceted-фильтры каталога с учётом активных параметров URL',
  })
  findCatalogFilters(@Query() query: Record<string, string | string[] | undefined>) {
    return this.publicCatalogService.getFacetedFilters(parsePublicCatalogListQuery(query));
  }

  @Get('catalog/sitemap-data')
  @ApiOperation({ summary: 'Slug категорий и товаров для sitemap.xml' })
  getCatalogSitemapData() {
    return this.publicCatalogService.getSitemapData();
  }

  @Get('featured')
  @ApiOperation({ summary: 'Популярные товары для главной страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество товаров (по умолчанию 8)' })
  @ApiQuery({
    name: 'primaryFilter',
    required: false,
    enum: ['featured', 'new', 'featured_or_new', 'any'],
    description: 'Показывать первыми: featured (Хит), new (Новинка), featured_or_new, any',
  })
  @ApiQuery({
    name: 'secondaryOrder',
    required: false,
    enum: ['sort_order', 'created_desc'],
    description: 'Сортировка: sort_order (по порядку), created_desc (по дате)',
  })
  async findFeatured(
    @Query('limit') limit?: string,
    @Query('primaryFilter') primaryFilter?: string,
    @Query('secondaryOrder') secondaryOrder?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 8;
    const filter: 'featured' | 'new' | 'featured_or_new' | 'any' =
      primaryFilter && ['featured', 'new', 'featured_or_new', 'any'].includes(primaryFilter)
        ? (primaryFilter as 'featured' | 'new' | 'featured_or_new' | 'any')
        : 'featured';
    const order: 'sort_order' | 'created_desc' =
      secondaryOrder && ['sort_order', 'created_desc'].includes(secondaryOrder)
        ? (secondaryOrder as 'sort_order' | 'created_desc')
        : 'sort_order';
    try {
      return await this.productsService.findFeatured(limitNum, filter, order);
    } catch (err) {
      console.error('[ProductsController] findFeatured failed:', err);
      return { products: [] };
    }
  }

  @Get('scrape/price')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить цену товара по ссылке поставщика' })
  @ApiQuery({ name: 'url', required: true, description: 'URL товара у поставщика' })
  @ApiQuery({ name: 'supplierId', required: false, description: 'ID поставщика' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'ID категории товара' })
  async getPriceFromUrl(
    @Query('url') url: string,
    @Query('supplierId') supplierId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.priceScraperService.getPriceFromUrl(url, { supplierId, categoryId });
  }

  @Get('scrape/parser')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Определить, какой парсер будет использован для поставщика/категории/ссылки',
  })
  @ApiQuery({ name: 'url', required: false, description: 'URL товара у поставщика (опционально)' })
  @ApiQuery({ name: 'supplierId', required: false, description: 'ID поставщика' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'ID категории товара' })
  async getParserInfo(
    @Query('url') url?: string,
    @Query('supplierId') supplierId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const parser = await this.priceScraperService.getParserInfo({ url, supplierId, categoryId });
    return { parser };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить товар по ID' })
  @Header('Cache-Control', 'no-store, max-age=0, must-revalidate')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Получить товар по slug' })
  @Header('Cache-Control', 'no-store, max-age=0, must-revalidate')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get('category/:categorySlug/filters')
  @ApiOperation({
    summary: 'Фильтры каталога для категории (ветка + фасеты по атрибутам и производителям)',
  })
  findCategoryFilters(@Param('categorySlug') categorySlug: string) {
    return this.productsService.findCategoryFilters(categorySlug);
  }

  @Get('category/:categorySlug')
  @ApiOperation({ summary: 'Получить товары по категории (slug)' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Поиск по наименованию и артикулу (SKU) внутри категории',
  })
  findByCategory(@Param('categorySlug') categorySlug: string, @Query('search') search?: string) {
    return this.productsService.findByCategory(categorySlug, search);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить товар' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req: RequestWithUser,
  ) {
    return this.productsService.update(id, updateProductDto, req.user?.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить товар' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
