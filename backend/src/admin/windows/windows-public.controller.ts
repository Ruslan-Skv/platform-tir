import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WindowsService } from './windows.service';

@ApiTags('windows')
@Controller('windows')
export class WindowsPublicController {
  constructor(private readonly windowsService: WindowsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Раздел «Окна»: настройки + бренды с профильными системами (публичный)',
  })
  getSection() {
    return this.windowsService.getPublicSection();
  }
}
