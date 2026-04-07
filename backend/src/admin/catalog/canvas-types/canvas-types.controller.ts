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
import { CanvasTypesService } from './canvas-types.service';
import { CreateCanvasTypeDto } from './dto/create-canvas-type.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/catalog/canvas-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'PARTNER')
export class CanvasTypesController {
  constructor(private readonly canvasTypesService: CanvasTypesService) {}

  @Post()
  create(@Body() dto: CreateCanvasTypeDto) {
    return this.canvasTypesService.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.canvasTypesService.findAll({
      search,
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.canvasTypesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<CreateCanvasTypeDto>) {
    return this.canvasTypesService.update(id, data);
  }

  @Post('reorder')
  reorder(@Body() items: { id: string; order: number }[]) {
    return this.canvasTypesService.reorder(items);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.canvasTypesService.remove(id);
  }
}
