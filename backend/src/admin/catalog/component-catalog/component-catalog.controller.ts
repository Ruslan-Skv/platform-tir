import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ComponentCatalogService } from './component-catalog.service';
import { CreateComponentCatalogItemDto } from './dto/create-component-catalog-item.dto';
import { UpdateComponentCatalogItemDto } from './dto/update-component-catalog-item.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/catalog/component-catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'PARTNER')
export class ComponentCatalogController {
  constructor(private readonly service: ComponentCatalogService) {}

  @Post()
  create(@Body() dto: CreateComponentCatalogItemDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('kindId') kindId?: string,
    @Query('groupId') groupId?: string,
    @Query('seriesId') seriesId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.findAll({
      search,
      kindId,
      groupId,
      seriesId,
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComponentCatalogItemDto) {
    return this.service.update(id, dto);
  }

  @Post('reorder')
  reorder(@Body() items: { id: string; sortOrder: number }[]) {
    return this.service.reorder(items);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
