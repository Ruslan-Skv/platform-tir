import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SitePublicService } from './site-public.service';

@ApiTags('site-public')
@Controller('site-public')
export class SitePublicController {
  constructor(private readonly sitePublic: SitePublicService) {}

  @Get('config')
  @ApiOperation({ summary: 'Публичная конфигурация сайта (без авторизации)' })
  getConfig() {
    return this.sitePublic.getPublicConfig();
  }
}
