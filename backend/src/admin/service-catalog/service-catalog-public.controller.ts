import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ServiceCatalogService } from './service-catalog.service';
import { CalculateServicesDto } from './dto/calculate-services.dto';

@ApiTags('service-catalog')
@Controller('service-catalog')
export class ServiceCatalogPublicController {
  constructor(private readonly service: ServiceCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Ремонт квартир (публичный)' })
  getCatalog() {
    return this.service.getPublicCatalog();
  }

  @Get('categories/:slug')
  @ApiOperation({ summary: 'Категория по slug (публичная)' })
  getCategory(@Param('slug') slug: string) {
    return this.service.getPublicCategoryBySlug(slug);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Рассчитать стоимость работ' })
  calculate(@Body() dto: CalculateServicesDto) {
    return this.service.calculateTotal(dto.items);
  }
}
