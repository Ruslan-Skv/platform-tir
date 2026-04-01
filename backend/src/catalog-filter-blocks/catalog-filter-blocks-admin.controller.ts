import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CatalogFilterBlocksService } from './catalog-filter-blocks.service';
import { CreateCatalogFilterBlockDto } from './dto/create-catalog-filter-block.dto';
import { UpdateCatalogFilterBlockDto } from './dto/update-catalog-filter-block.dto';

@ApiTags('admin-catalog-filter-blocks')
@Controller('admin/catalog-filter-blocks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class CatalogFilterBlocksAdminController {
  constructor(private readonly catalogFilterBlocksService: CatalogFilterBlocksService) {}

  @Get()
  @ApiOperation({ summary: 'Список блоков фильтров каталога' })
  findAll() {
    return this.catalogFilterBlocksService.findAllAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Блок фильтров по id' })
  findOne(@Param('id') id: string) {
    return this.catalogFilterBlocksService.findOneAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать блок фильтров' })
  create(@Body() dto: CreateCatalogFilterBlockDto) {
    return this.catalogFilterBlocksService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить блок фильтров' })
  update(@Param('id') id: string, @Body() dto: UpdateCatalogFilterBlockDto) {
    return this.catalogFilterBlocksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить блок фильтров' })
  remove(@Param('id') id: string) {
    return this.catalogFilterBlocksService.remove(id);
  }
}
