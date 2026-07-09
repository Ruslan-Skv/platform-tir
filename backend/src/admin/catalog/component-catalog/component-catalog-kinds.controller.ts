import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ComponentCatalogKindsService } from '../../../products/services/component-catalog-kinds.service';
import { CreateComponentCatalogKindDto } from '../../../products/dto/create-component-catalog-kind.dto';
import { UpdateComponentCatalogKindDto } from '../../../products/dto/update-component-catalog-kind.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/catalog/component-catalog-kinds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'PARTNER')
export class ComponentCatalogKindsController {
  constructor(private readonly service: ComponentCatalogKindsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateComponentCatalogKindDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComponentCatalogKindDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
