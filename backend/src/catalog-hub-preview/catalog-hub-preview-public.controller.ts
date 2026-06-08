import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CatalogHubPreviewService, type HubPreviewMode } from './catalog-hub-preview.service';

@ApiTags('products')
@Controller('products/catalog')
export class CatalogHubPreviewPublicController {
  constructor(private readonly catalogHubPreviewService: CatalogHubPreviewService) {}

  @Get('hub-preview')
  @ApiOperation({ summary: 'Превью разделов на хабе каталога /catalog/products' })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['featured', 'new'],
    description: 'featured — популярное, new — новинки',
  })
  getHubPreview(@Query('mode') mode?: string) {
    const resolved: HubPreviewMode = mode === 'new' || mode === 'featured' ? mode : 'featured';
    return this.catalogHubPreviewService.getPublicPreview(resolved);
  }
}
