import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogBlockService } from './catalog-block.service';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogBlockController {
  constructor(private readonly catalogBlockService: CatalogBlockService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Получить настройки каталога (публичный)' })
  getSettings() {
    return this.catalogBlockService.getSettings();
  }
}
