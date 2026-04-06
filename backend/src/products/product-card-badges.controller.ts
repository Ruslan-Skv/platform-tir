import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductCardBadgesService } from './product-card-badges.service';

@ApiTags('product-card-badges')
@Controller('product-card-badges')
export class ProductCardBadgesController {
  constructor(private readonly productCardBadgesService: ProductCardBadgesService) {}

  @Get('definitions')
  @ApiOperation({
    summary: 'Список типов бэйджей карточки товара (настройка картинок — в админке)',
  })
  findDefinitions() {
    return this.productCardBadgesService.getDefinitions();
  }
}
