import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PromotionService } from './promotion.service';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionPublicController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get()
  @ApiOperation({ summary: 'Список акций (публичный)' })
  findAll() {
    return this.promotionService.getPublicList();
  }
}
