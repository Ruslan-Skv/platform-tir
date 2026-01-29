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
import { ManufacturersService } from './manufacturers.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/catalog/manufacturers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
export class ManufacturersController {
  constructor(private readonly manufacturersService: ManufacturersService) {}

  @Post()
  create(@Body() createManufacturerDto: CreateManufacturerDto) {
    return this.manufacturersService.create(createManufacturerDto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.manufacturersService.findAll({
      search,
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.manufacturersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<CreateManufacturerDto>) {
    return this.manufacturersService.update(id, data);
  }

  @Post('reorder')
  reorder(@Body() items: { id: string; order: number }[]) {
    return this.manufacturersService.reorder(items);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.manufacturersService.remove(id);
  }
}
