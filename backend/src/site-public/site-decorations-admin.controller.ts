import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateSiteDecorationDto } from './dto/update-site-decoration.dto';
import { SitePublicService } from './site-public.service';

@ApiTags('admin/site-decorations')
@Controller('admin/site-decorations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class SiteDecorationsAdminController {
  constructor(private readonly sitePublic: SitePublicService) {}

  @Get()
  @ApiOperation({ summary: 'Украшения публичного сайта (супер-админ)' })
  list() {
    return this.sitePublic.listAdminDecorations();
  }

  @Patch(':code')
  @ApiOperation({ summary: 'Обновить украшение по коду (супер-админ)' })
  update(@Param('code') code: string, @Body() dto: UpdateSiteDecorationDto) {
    return this.sitePublic.updateAdminDecoration(code, dto);
  }
}
