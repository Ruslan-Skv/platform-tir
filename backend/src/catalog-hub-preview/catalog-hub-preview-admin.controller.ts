import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CatalogHubPreviewService } from './catalog-hub-preview.service';
import { UpdateCatalogHubPreviewDto } from './dto/catalog-hub-preview.dto';

@ApiTags('admin-catalog-hub-preview')
@Controller('admin/catalog/hub-preview')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class CatalogHubPreviewAdminController {
  constructor(private readonly catalogHubPreviewService: CatalogHubPreviewService) {}

  @Get()
  @ApiOperation({ summary: 'Настройки превью хаба каталога' })
  getConfig() {
    return this.catalogHubPreviewService.getAdminConfig();
  }

  @Put()
  @ApiOperation({ summary: 'Сохранить настройки превью хаба каталога' })
  updateConfig(@Body() dto: UpdateCatalogHubPreviewDto) {
    return this.catalogHubPreviewService.updateConfig(dto);
  }
}
