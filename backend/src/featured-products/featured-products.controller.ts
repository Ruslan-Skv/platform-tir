import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeaturedProductsService } from './featured-products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateFeaturedProductsBlockDto } from './dto/update-featured-products-block.dto';

@ApiTags('home-featured-products')
@Controller('home/featured-products')
export class FeaturedProductsController {
  constructor(private readonly featuredProductsService: FeaturedProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить настройки блока «Популярные товары» (публичный)' })
  getBlock() {
    return this.featuredProductsService.getBlock();
  }
}

@ApiTags('admin/home-featured-products')
@Controller('admin/home/featured-products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminFeaturedProductsController {
  constructor(private readonly featuredProductsService: FeaturedProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить настройки блока (админ)' })
  getBlock() {
    return this.featuredProductsService.getBlock();
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить настройки блока «Популярные товары»' })
  updateBlock(@Body() dto: UpdateFeaturedProductsBlockDto) {
    return this.featuredProductsService.updateBlock(dto);
  }
}
