import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BlindsService } from './blinds.service';

@ApiTags('blinds')
@Controller('blinds')
export class BlindsPublicController {
  constructor(private readonly blindsService: BlindsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Раздел «Жалюзи»: настройки + категории с изделиями (публичный)',
  })
  getSection() {
    return this.blindsService.getPublicSection();
  }
}
