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
import { ProductComponentsService } from './product-components.service';
import { CreateProductComponentDto } from './dto/create-product-component.dto';
import { UpdateProductComponentDto } from './dto/update-product-component.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('product-components')
@Controller('product-components')
export class ProductComponentsController {
  constructor(private readonly componentsService: ProductComponentsService) {}

  @Post('product/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать комплектующее для товара' })
  create(@Param('productId') productId: string, @Body() createDto: CreateProductComponentDto) {
    return this.componentsService.create(productId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все комплектующие (только активные)' })
  findAll(@Query('productId') productId?: string) {
    return this.componentsService.findAll(productId);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить все комплектующие для админки (включая неактивные)' })
  findAllAdmin(@Query('productId') productId?: string) {
    return this.componentsService.findAllAdmin(productId);
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить комплектующее' })
  update(@Param('id') id: string, @Body() updateDto: UpdateProductComponentDto) {
    return this.componentsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить комплектующее' })
  remove(@Param('id') id: string) {
    return this.componentsService.remove(id);
  }
}
