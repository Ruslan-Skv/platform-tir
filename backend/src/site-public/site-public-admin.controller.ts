import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateSitePublicDto } from './dto/update-site-public.dto';
import { SitePublicService } from './site-public.service';

@ApiTags('admin/site-public')
@Controller('admin/site-public')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class SitePublicAdminController {
  constructor(private readonly sitePublic: SitePublicService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Настройки публичного сайта (супер-админ)' })
  getSettings() {
    return this.sitePublic.getAdminSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки (супер-админ)' })
  updateSettings(@Body() dto: UpdateSitePublicDto) {
    return this.sitePublic.updateAdminSettings(dto);
  }
}
