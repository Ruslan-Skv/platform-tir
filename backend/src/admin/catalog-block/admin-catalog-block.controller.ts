import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogBlockService } from '../../catalog-block/catalog-block.service';
import { UpdateCatalogBlockDto } from './dto/update-catalog-block.dto';

@ApiTags('admin/catalog-block')
@Controller('admin/catalog-block')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class AdminCatalogBlockController {
  constructor(private readonly catalogBlockService: CatalogBlockService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Получить настройки каталога (режим просмотра на мобильном)' })
  getSettings() {
    return this.catalogBlockService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки каталога (режим по умолчанию на мобильном)' })
  updateSettings(@Body() dto: UpdateCatalogBlockDto) {
    return this.catalogBlockService.updateSettings(dto);
  }
}
