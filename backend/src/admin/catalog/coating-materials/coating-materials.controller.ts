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
import { CoatingMaterialsService } from './coating-materials.service';
import { CreateCoatingMaterialDto } from './dto/create-coating-material.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/catalog/coating-materials')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'PARTNER')
export class CoatingMaterialsController {
  constructor(private readonly coatingMaterialsService: CoatingMaterialsService) {}

  @Post()
  create(@Body() dto: CreateCoatingMaterialDto) {
    return this.coatingMaterialsService.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coatingMaterialsService.findAll({
      search,
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coatingMaterialsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<CreateCoatingMaterialDto>) {
    return this.coatingMaterialsService.update(id, data);
  }

  @Post('reorder')
  reorder(@Body() items: { id: string; order: number }[]) {
    return this.coatingMaterialsService.reorder(items);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coatingMaterialsService.remove(id);
  }
}
