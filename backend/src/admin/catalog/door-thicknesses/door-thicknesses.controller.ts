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
import { DoorThicknessesService } from './door-thicknesses.service';
import { CreateDoorThicknessDto } from './dto/create-door-thickness.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/catalog/door-thicknesses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'PARTNER')
export class DoorThicknessesController {
  constructor(private readonly doorThicknessesService: DoorThicknessesService) {}

  @Post()
  create(@Body() dto: CreateDoorThicknessDto) {
    return this.doorThicknessesService.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.doorThicknessesService.findAll({
      search,
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.doorThicknessesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<CreateDoorThicknessDto>) {
    return this.doorThicknessesService.update(id, data);
  }

  @Post('reorder')
  reorder(@Body() items: { id: string; order: number }[]) {
    return this.doorThicknessesService.reorder(items);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.doorThicknessesService.remove(id);
  }
}
