import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StretchCeilingsService } from './stretch-ceilings.service';

@ApiTags('stretch-ceilings')
@Controller('stretch-ceilings')
export class StretchCeilingsPublicController {
  constructor(private readonly stretchCeilingsService: StretchCeilingsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Раздел «Натяжные потолки»: настройки + производители с фактурами (публичный)',
  })
  getSection() {
    return this.stretchCeilingsService.getPublicSection();
  }
}
