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
import { ComponentCatalogGroupsService } from './component-catalog-groups.service';
import { CreateComponentCatalogGroupDto } from './dto/create-component-catalog-group.dto';
import { UpdateComponentCatalogGroupDto } from './dto/update-component-catalog-group.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/catalog/component-catalog-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'PARTNER')
export class ComponentCatalogGroupsController {
  constructor(private readonly service: ComponentCatalogGroupsService) {}

  @Post()
  create(@Body() dto: CreateComponentCatalogGroupDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      search,
      categoryId,
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComponentCatalogGroupDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/items')
  setItems(@Param('id') id: string, @Body() body: { catalogItemIds: string[] }) {
    return this.service.setGroupItems(id, body.catalogItemIds ?? []);
  }

  @Post(':id/items/:catalogItemId')
  addItem(@Param('id') id: string, @Param('catalogItemId') catalogItemId: string) {
    return this.service.addGroupItem(id, catalogItemId);
  }

  @Delete(':id/items/:catalogItemId')
  removeItem(@Param('id') id: string, @Param('catalogItemId') catalogItemId: string) {
    return this.service.removeGroupItem(id, catalogItemId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
