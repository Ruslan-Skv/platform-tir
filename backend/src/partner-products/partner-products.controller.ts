import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PartnerProductsService } from './partner-products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdatePartnerProductsBlockDto } from './dto/update-partner-products-block.dto';

@ApiTags('partner-products')
@Controller('home/partner-products')
export class PartnerProductsController {
  constructor(private readonly partnerProductsService: PartnerProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить настройки отображения товаров партнёра (публичный)' })
  getBlock() {
    return this.partnerProductsService.getBlock();
  }
}

@ApiTags('admin/partner-products')
@Controller('admin/home/partner-products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminPartnerProductsController {
  constructor(private readonly partnerProductsService: PartnerProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить настройки (админ)' })
  getBlock() {
    return this.partnerProductsService.getBlock();
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить настройки отображения товаров партнёра' })
  updateBlock(@Body() dto: UpdatePartnerProductsBlockDto) {
    return this.partnerProductsService.updateBlock(dto);
  }
}
