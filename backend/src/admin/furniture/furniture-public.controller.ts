import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FurnitureService } from './furniture.service';

@ApiTags('furniture')
@Controller('furniture')
export class FurniturePublicController {
  constructor(private readonly furnitureService: FurnitureService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Раздел «Мебель»: настройки + категории с изделиями (публичный)',
  })
  getSection() {
    return this.furnitureService.getPublicSection();
  }
}
